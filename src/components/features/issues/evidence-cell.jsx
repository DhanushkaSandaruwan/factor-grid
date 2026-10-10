'use client';

import { useRef, useState } from 'react';
import {
  File,
  FileArchive,
  FileText,
  Image,
  Music,
  Plus,
  Video,
  X,
} from 'lucide-react';
import { cn } from 'cn';

/**
 * Upload one file straight to the storage API, reporting progress.
 * @param {File} file
 * @param {string} projectId
 * @param {(percent: number) => void} onProgress
 * @returns {Promise<{file: {_id: string, filename: string, contentType: string, size: number}}>}
 */
function uploadFileWithProgress(file, projectId, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('projectId', projectId);
    form.append('label', 'requirement-evidence');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/storage/upload');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(form);
  });
}

/** Pick the icon that best represents a file's content type. */
function iconFor(contentType) {
  const type = String(contentType ?? '').toLowerCase();
  if (type.startsWith('image/')) return Image;
  if (type.startsWith('video/')) return Video;
  if (type.startsWith('audio/')) return Music;
  if (type.includes('zip') || type.includes('compressed')) return FileArchive;
  if (
    type.includes('pdf') ||
    type.includes('word') ||
    type.includes('excel') ||
    type.includes('powerpoint') ||
    type.includes('presentation') ||
    type.startsWith('text/')
  ) {
    return FileText;
  }
  return File;
}

/**
 * Evidence cell for one requirement — file-type icons with download, an
 * upload button with live progress, and per-file delete.
 *
 * @param {{ projectId: string, issueId: string, recommendationId: string, requirement: object, onIssueUpdated: (issue: object) => void }} props
 */
export function EvidenceCell({ projectId, issueId, recommendationId, requirement, onIssueUpdated }) {
  const inputRef = useRef(null);
  const [uploads, setUploads] = useState([]);
  const [error, setError] = useState('');

  async function handleFilesSelected(event) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;

    setError('');
    for (const file of files) {
      const entry = { name: file.name, progress: 0 };
      setUploads((prev) => [...prev, entry]);
      try {
        const { file: uploaded } = await uploadFileWithProgress(file, projectId, (progress) => {
          setUploads((prev) =>
            prev.map((u) => (u.name === entry.name ? { ...u, progress } : u))
          );
        });

        const response = await fetch(
          `/api/projects/${projectId}/issues/${issueId}/requirements/${requirement._id}/evidence`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recommendationId,
              fileId: uploaded._id,
              filename: uploaded.filename,
              contentType: uploaded.contentType,
              size: uploaded.size,
            }),
          }
        );
        if (!response.ok) throw new Error('Failed to attach evidence.');
        const data = await response.json();
        onIssueUpdated(data.issue);
      } catch (err) {
        console.error('Evidence upload failed:', err);
        setError('Upload failed.');
      } finally {
        setUploads((prev) => prev.filter((u) => u.name !== entry.name));
      }
    }
  }

  async function handleDelete(fileId) {
    setError('');
    try {
      const response = await fetch(
        `/api/projects/${projectId}/issues/${issueId}/requirements/${requirement._id}/evidence` +
          `?recommendationId=${recommendationId}&fileId=${fileId}`,
        { method: 'DELETE' }
      );
      if (!response.ok) throw new Error('Failed to delete evidence.');
      const data = await response.json();
      onIssueUpdated(data.issue);
    } catch (err) {
      console.error('Evidence delete failed:', err);
      setError('Delete failed.');
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {(requirement.evidence ?? []).map((item) => {
        const Icon = iconFor(item.contentType);
        return (
          <span key={item.fileId} className="group/evidence relative inline-flex">
            <a
              href={`/api/storage/files/${item.fileId}/content?disposition=attachment`}
              target="_blank"
              rel="noopener noreferrer"
              title={`Download — ${item.filename}`}
              className="text-muted-foreground hover:text-primary hover:bg-accent rounded p-1 transition-colors"
            >
              <Icon className="size-4" />
            </a>
            <button
              type="button"
              aria-label={`Delete ${item.filename}`}
              title={`Delete ${item.filename}`}
              onClick={() => handleDelete(item.fileId)}
              className="bg-destructive text-destructive-foreground absolute -top-1.5 -right-1.5 hidden size-3.5 items-center justify-center rounded-full group-hover/evidence:flex"
            >
              <X className="size-2.5" />
            </button>
          </span>
        );
      })}

      {uploads.map((upload) => (
        <span
          key={upload.name}
          title={`Uploading ${upload.name} — ${upload.progress}%`}
          className="bg-muted relative inline-flex items-center gap-1 rounded px-1.5 py-1"
        >
          <File className="text-muted-foreground size-4 animate-pulse" />
          <span className="text-muted-foreground text-[0.6rem] font-medium tabular-nums">
            {upload.progress}%
          </span>
        </span>
      ))}

      <button
        type="button"
        aria-label="Upload evidence"
        title="Upload evidence files"
        onClick={() => inputRef.current?.click()}
        className="text-muted-foreground hover:text-primary hover:bg-accent rounded p-1 transition-colors"
      >
        <Plus className="size-4" />
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
      />

      {error && (
        <span className={cn('text-destructive text-[0.6rem] font-medium')}>{error}</span>
      )}
    </div>
  );
}
