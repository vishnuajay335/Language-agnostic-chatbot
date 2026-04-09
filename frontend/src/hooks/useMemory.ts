import { useState, useCallback, useEffect } from "react";

export function useMemory() {
  const [files, setFiles] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [deletingFiles, setDeletingFiles] = useState<Record<string, boolean>>({});

  const fetchMemory = useCallback(async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const res = await fetch(`${API_BASE_URL}/memory`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error("Failed to fetch memory:", error);
    }
  }, []);

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });
      
      if (res.ok) {
        await fetchMemory();
        return true;
      }
      return false;
    } catch (error) {
      console.error("File upload failed:", error);
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFile = async (filename: string) => {
    setDeletingFiles((prev) => ({ ...prev, [filename]: true }));
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const res = await fetch(`${API_BASE_URL}/memory/${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        await fetchMemory();
        return true;
      }
      return false;
    } catch (error) {
      console.error("File deletion failed:", error);
      return false;
    } finally {
      setDeletingFiles((prev) => ({ ...prev, [filename]: false }));
    }
  };

  useEffect(() => {
    fetchMemory();
  }, [fetchMemory]);

  return { files, uploadFile, isUploading, deleteFile, deletingFiles, refreshMemory: fetchMemory };
}
