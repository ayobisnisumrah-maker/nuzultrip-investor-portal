-- PostgreSQL enum additions must commit before later migrations can safely use
-- the new value in constraints, functions, and DML.
-- Kept as a dedicated migration so later schema objects see a committed enum value.
alter type public.financial_statement
  add value if not exists 'changes_in_equity';
