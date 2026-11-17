// A small in-memory stand-in for the Supabase client, covering only the calls the app makes.
// It lets the tests run whole conversations without a real database.

type Row = Record<string, unknown>;
type Result = { data: unknown; error: { code: string; message: string } | null; count?: number | null };

const DEFAULTS: Record<string, () => Row> = {
  users: () => ({
    first_name: null, timezone: "America/Chicago", morning_time: "07:00", evening_time: "20:00",
    sms_consent_at: null, sms_opted_out_at: null, convo_state: null, convo_data: {}, age_confirmed_at: null,
    over_21: null, age_gate_failed_at: null, trial_used_at: null,
  }),
  enrollments: () => ({
    custom_habit: null, status: "pending_payment", offset_days: 0, paid_at: null, trial_ends_on: null,
    paused_on: null, paused_day: null, pause_reason: null, active_since: null, stripe_customer_id: null,
    result_token: Math.random().toString(16).slice(2).padEnd(24, "0").slice(0, 24),
  }),
  partners: () => ({ name: null, phone: null, invite_code: null, consented_at: null, opted_out_at: null }),
  messages: () => ({ user_id: null, partner_id: null, enrollment_id: null, twilio_sid: null }),
  check_ins: () => ({ day_number: null }),
  scheduled_sends: () => ({}),
  videos: () => ({}),
  prompts: () => ({}),
};

const UNIQUE: Record<string, string[][]> = {
  users: [["phone"]],
  partners: [["invite_code"], ["enrollment_id"]],
  messages: [["twilio_sid"]],
  check_ins: [["enrollment_id", "day"]],
  scheduled_sends: [["enrollment_id", "kind", "send_date"]],
};

export class FakeDb {
  tables: Record<string, Row[]> = {
    users: [], enrollments: [], partners: [], messages: [], check_ins: [], scheduled_sends: [], videos: [], prompts: [],
  };
  now = new Date("2027-01-01T00:00:00Z");
  private nextId = 1;

  constructor() {
    for (let day = 1; day <= 30; day += 1) {
      this.tables.prompts.push({ habit_slug: "other", day_number: day, body: `Do the day ${day} thing for {habit}.` });
    }
  }

  from(table: string) {
    return new Query(this, table);
  }

  newRow(table: string, values: Row): Row {
    this.nextId += 1;
    return {
      id: `${table}-${this.nextId}`,
      // Rows made in the same instant still sort in the order they were made.
      created_at: new Date(this.now.getTime() + this.nextId).toISOString(),
      ...DEFAULTS[table]?.(),
      ...values,
    };
  }

  conflicts(table: string, row: Row, ignore?: Row): boolean {
    return (UNIQUE[table] ?? []).some((cols) =>
      cols.every((c) => row[c] != null) &&
      this.tables[table].some((other) => other !== ignore && cols.every((c) => other[c] === row[c])),
    );
  }

  remove(table: string, rows: Row[]) {
    this.tables[table] = this.tables[table].filter((r) => !rows.includes(r));
    const ids = rows.map((r) => r.id);
    const cascade = (child: string, column: string) => {
      const gone = this.tables[child].filter((r) => ids.includes(r[column]));
      if (gone.length) this.remove(child, gone);
    };
    if (table === "users") {
      cascade("enrollments", "user_id");
      cascade("messages", "user_id");
    }
    if (table === "enrollments") {
      for (const child of ["partners", "check_ins", "scheduled_sends", "messages"]) cascade(child, "enrollment_id");
    }
  }
}

class Query implements PromiseLike<Result> {
  private filters: Array<(r: Row) => boolean> = [];
  private op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: Row | Row[] = {};
  private columns = "*";
  private head = false;
  private wantCount = false;
  private one = false;
  private sort: { column: string; ascending: boolean } | null = null;
  private max: number | null = null;
  private conflictKey: string[] = [];

  constructor(private store: FakeDb, private table: string) {}

  select(columns = "*", options?: { count?: string; head?: boolean }) {
    this.columns = columns;
    this.head = options?.head ?? false;
    this.wantCount = options?.count === "exact";
    return this;
  }
  insert(values: Row | Row[]) { this.op = "insert"; this.payload = values; return this; }
  update(values: Row) { this.op = "update"; this.payload = values; return this; }
  upsert(values: Row, options: { onConflict: string }) {
    this.op = "upsert"; this.payload = values; this.conflictKey = options.onConflict.split(","); return this;
  }
  delete() { this.op = "delete"; return this; }

  eq(c: string, v: unknown) { this.filters.push((r) => r[c] === v); return this; }
  neq(c: string, v: unknown) { this.filters.push((r) => r[c] !== v); return this; }
  in(c: string, vs: unknown[]) { this.filters.push((r) => vs.includes(r[c])); return this; }
  is(c: string, v: null) { this.filters.push((r) => (r[c] ?? null) === v); return this; }
  not(c: string, ...rest: unknown[]) { void rest; this.filters.push((r) => r[c] != null); return this; }
  lt(c: string, v: string) { this.filters.push((r) => String(r[c]) < v); return this; }
  gte(c: string, v: string) { this.filters.push((r) => String(r[c]) >= v); return this; }
  match(values: Row) { for (const [c, v] of Object.entries(values)) this.eq(c, v); return this; }
  order(column: string, options?: { ascending?: boolean }) {
    this.sort = { column, ascending: options?.ascending ?? true }; return this;
  }
  limit(n: number) { this.max = n; return this; }
  single() { this.one = true; return this; }

  then<A = Result, B = never>(
    resolve?: ((value: Result) => A | PromiseLike<A>) | null,
    reject?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve(this.run()).then(resolve, reject);
  }

  private matching(): Row[] {
    return this.store.tables[this.table].filter((r) => this.filters.every((f) => f(r)));
  }

  private shape(rows: Row[]): Result {
    let out = rows.map((r) => ({ ...r }));
    if (this.table === "enrollments" && this.columns.includes("users!inner")) {
      out = out.map((r) => ({
        ...r,
        users: { ...this.store.tables.users.find((u) => u.id === r.user_id) },
        partners: this.store.tables.partners.filter((p) => p.enrollment_id === r.id).map((p) => ({ ...p })),
      }));
    }
    if (this.sort) {
      const { column, ascending } = this.sort;
      out.sort((a, b) => (String(a[column]) < String(b[column]) ? -1 : 1) * (ascending ? 1 : -1));
    }
    const count = this.wantCount ? out.length : null;
    if (this.max != null) out = out.slice(0, this.max);
    if (this.head) return { data: null, error: null, count };
    if (this.one) {
      return out.length === 1
        ? { data: out[0], error: null, count }
        : { data: null, error: { code: "PGRST116", message: "expected one row" }, count };
    }
    return { data: out, error: null, count };
  }

  private run(): Result {
    const rows = this.store.tables[this.table];
    const duplicate: Result = { data: null, error: { code: "23505", message: "duplicate key" } };

    if (this.op === "insert") {
      const made: Row[] = [];
      for (const values of Array.isArray(this.payload) ? this.payload : [this.payload]) {
        const row = this.store.newRow(this.table, values);
        if (this.store.conflicts(this.table, row)) return duplicate;
        rows.push(row);
        made.push(row);
      }
      return this.shape(made);
    }
    if (this.op === "upsert") {
      const values = this.payload as Row;
      const existing = rows.find((r) => this.conflictKey.every((c) => r[c] === values[c]));
      if (existing) Object.assign(existing, values);
      else rows.push(this.store.newRow(this.table, values));
      return { data: null, error: null };
    }
    if (this.op === "update") {
      const targets = this.matching();
      for (const row of targets) {
        if (this.store.conflicts(this.table, { ...row, ...(this.payload as Row) }, row)) return duplicate;
        Object.assign(row, this.payload);
      }
      return this.shape(targets);
    }
    if (this.op === "delete") {
      this.store.remove(this.table, this.matching());
      return { data: null, error: null };
    }
    return this.shape(this.matching());
  }
}
