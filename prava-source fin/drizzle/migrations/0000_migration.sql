CREATE TABLE public.app_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read settings" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.app_settings (id, data) VALUES (1, '{}'::jsonb);

CREATE OR REPLACE FUNCTION public.check_admin_pin(pin text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT pin = '1022';
$$;

CREATE OR REPLACE FUNCTION public.save_app_settings(pin text, new_data jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF pin IS DISTINCT FROM '1022' THEN
    RAISE EXCEPTION 'invalid pin';
  END IF;
  UPDATE public.app_settings SET data = new_data, updated_at = now() WHERE id = 1;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.check_admin_pin(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_app_settings(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_admin_pin(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_app_settings(text, jsonb) TO anon, authenticated;