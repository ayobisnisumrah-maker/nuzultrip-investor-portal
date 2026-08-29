REVOKE ALL ON FUNCTION public.current_principal() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_principal()
TO anon;

GRANT EXECUTE ON FUNCTION public.current_principal()
TO authenticated;

GRANT EXECUTE ON FUNCTION public.current_principal()
TO service_role;
