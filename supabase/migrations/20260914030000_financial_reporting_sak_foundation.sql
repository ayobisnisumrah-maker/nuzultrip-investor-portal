-- PostgreSQL enum additions must commit before later migrations can safely use
-- the new value in constraints, functions, and DML.
alter type public.financial_statement
  add value if not exists 'changes_in_equity';
