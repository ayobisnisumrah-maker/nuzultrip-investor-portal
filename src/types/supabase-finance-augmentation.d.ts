/* eslint-disable @typescript-eslint/no-explicit-any */

import '@supabase/supabase-js'

declare module '@supabase/supabase-js' {
  interface SupabaseClient {
    /**
     * Finance operational tables already exist in production but are not yet
     * represented by the repository's generated Database type. Keep this
     * overload deliberately scoped to the finance_ namespace so the rest of
     * the application remains fully generated-type checked.
     *
     * TODO: remove this compatibility overload once the production finance
     * schema is fully reconciled into migrations and src/types/database.ts.
     */
    from(relation: `finance_${string}`): any
  }
}
