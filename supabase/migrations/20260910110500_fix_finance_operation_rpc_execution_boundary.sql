-- The public lifecycle RPCs validate the caller's permission themselves, then
-- execute their atomic writes with the function owner's rights. Internal
-- helpers remain uncallable from PostgREST clients.
alter function app.create_finance_invoice(text, text, text, text, date, text, jsonb)
  security definer;
alter function app.issue_finance_invoice(uuid)
  security definer;
alter function app.record_finance_payment(uuid, numeric, text, timestamptz, text, text, text)
  security definer;
alter function app.process_finance_refund(uuid, uuid, numeric, text, text)
  security definer;
