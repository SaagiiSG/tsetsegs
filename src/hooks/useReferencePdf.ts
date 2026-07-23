import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Meta = {
  path: string | null;
  name: string | null;
  uploaded_at: string | null;
};

export function useReferencePdf(moduleId: string | undefined) {
  const [meta, setMeta] = useState<Meta>({ path: null, name: null, uploaded_at: null });
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!moduleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("bluebook_modules")
      .select("reference_pdf_path, reference_pdf_name, reference_pdf_uploaded_at")
      .eq("id", moduleId)
      .maybeSingle();
    setLoading(false);
    if (error) {
      console.error(error);
      return;
    }
    const path = (data as any)?.reference_pdf_path ?? null;
    setMeta({
      path,
      name: (data as any)?.reference_pdf_name ?? null,
      uploaded_at: (data as any)?.reference_pdf_uploaded_at ?? null,
    });
    if (path) {
      const { data: signed, error: sErr } = await supabase.storage
        .from("module-pdfs")
        .createSignedUrl(path, 60 * 60);
      if (sErr) {
        console.error(sErr);
        setSignedUrl(null);
      } else {
        setSignedUrl(signed?.signedUrl ?? null);
      }
    } else {
      setSignedUrl(null);
    }
  }, [moduleId]);

  useEffect(() => {
    load();
  }, [load]);

  const upload = useCallback(
    async (file: File) => {
      if (!moduleId) return;
      if (file.type !== "application/pdf") {
        toast.error("Please upload a PDF file");
        return;
      }
      if (file.size > 40 * 1024 * 1024) {
        toast.error("PDF must be smaller than 40MB");
        return;
      }
      setUploading(true);
      try {
        const key = `${moduleId}/${crypto.randomUUID()}.pdf`;
        const { error: upErr } = await supabase.storage
          .from("module-pdfs")
          .upload(key, file, { contentType: "application/pdf", upsert: false });
        if (upErr) throw upErr;

        // best-effort delete of the previous file
        if (meta.path) {
          await supabase.storage.from("module-pdfs").remove([meta.path]);
        }

        const { error: uErr } = await supabase
          .from("bluebook_modules")
          .update({
            reference_pdf_path: key,
            reference_pdf_name: file.name,
            reference_pdf_uploaded_at: new Date().toISOString(),
          } as any)
          .eq("id", moduleId);
        if (uErr) throw uErr;

        toast.success("Reference PDF uploaded");
        await load();
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [moduleId, meta.path, load]
  );

  const clear = useCallback(async () => {
    if (!moduleId) return;
    if (meta.path) {
      await supabase.storage.from("module-pdfs").remove([meta.path]);
    }
    await supabase
      .from("bluebook_modules")
      .update({
        reference_pdf_path: null,
        reference_pdf_name: null,
        reference_pdf_uploaded_at: null,
      } as any)
      .eq("id", moduleId);
    setMeta({ path: null, name: null, uploaded_at: null });
    setSignedUrl(null);
  }, [moduleId, meta.path]);

  return { meta, signedUrl, loading, uploading, upload, clear, reload: load };
}

export const PDF_INSERT_EVENT = "reference-pdf:insert-text";

export function dispatchPdfInsert(text: string) {
  window.dispatchEvent(new CustomEvent(PDF_INSERT_EVENT, { detail: text }));
}
