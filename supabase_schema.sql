-- ==============================================================================
-- TAPBOARD SUPABASE DATABASE SCHEMA
-- Run this in your Supabase project's SQL Editor (Dashboard -> SQL Editor)
-- ==============================================================================

-- 1. Create drawings / lectures table
CREATE TABLE IF NOT EXISTS public.drawings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled Lecture',
    slides JSONB NOT NULL DEFAULT '[]'::jsonb,
    grid_style TEXT NOT NULL DEFAULT 'dots',
    is_finite_mode BOOLEAN NOT NULL DEFAULT false,
    thumbnail TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Enable Row-Level Security (RLS)
ALTER TABLE public.drawings ENABLE ROW LEVEL SECURITY;

-- 3. Row-Level Security Policies (Each user can only access their own drawings)

-- SELECT: Users can view their own drawings
CREATE POLICY "Users can view their own drawings" 
ON public.drawings 
FOR SELECT 
USING (auth.uid() = user_id);

-- INSERT: Users can insert drawings with their own user_id
CREATE POLICY "Users can insert their own drawings" 
ON public.drawings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own drawings
CREATE POLICY "Users can update their own drawings" 
ON public.drawings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- DELETE: Users can delete their own drawings
CREATE POLICY "Users can delete their own drawings" 
ON public.drawings 
FOR DELETE 
USING (auth.uid() = user_id);

-- 4. Automatically update updated_at timestamp on row update
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_drawings_updated ON public.drawings;
CREATE TRIGGER on_drawings_updated
    BEFORE UPDATE ON public.drawings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. Create index for fast retrieval by user and updated_at
CREATE INDEX IF NOT EXISTS drawings_user_id_idx ON public.drawings(user_id, updated_at DESC);
