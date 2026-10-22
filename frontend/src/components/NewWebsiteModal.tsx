'use client';

import React, { useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { normalizeUrl, isValidUrl, WebProject, genericSamples } from '@/lib/demoData';
import { api } from '@/lib/api';

interface NewWebsiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectAdded: (project: WebProject) => void;
}

export default function NewWebsiteModal({ isOpen, onClose, onProjectAdded }: NewWebsiteModalProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    let cleanUrl = normalizeUrl(url.trim());

    if (!cleanName) {
      setError('Please enter the organization name.');
      return;
    }
    if (!isValidUrl(cleanUrl)) {
      setError('Please enter a full URL, e.g. https://example.com');
      return;
    }

    // If URL does not end with .xml, auto-suggest or append /sitemap.xml for sitemap ingestion
    let sitemapUrl = cleanUrl;
    if (!cleanUrl.toLowerCase().endsWith('.xml')) {
      sitemapUrl = cleanUrl.replace(/\/+$/, '') + '/sitemap.xml';
    }

    let domain = cleanUrl;
    try {
      domain = new URL(cleanUrl).hostname.replace(/^www\./, '');
    } catch (e) {}

    setIsSubmitting(true);
    setError('');

    let newProject: WebProject;

    try {
      // 1. Ingest sitemap in FastAPI backend
      const proj = await api.createCollegeProject(cleanName, sitemapUrl, 3, 'college');
      
      // 2. Fetch discovered sources from sitemap
      let discoveredUrls: string[] = [];
      try {
        const sources = await api.getCollegeProjectSources(proj.id);
        if (Array.isArray(sources) && sources.length > 0) {
          discoveredUrls = sources.map(s => s.url);
        }
      } catch (e) {}

      newProject = {
        key: proj.id,
        name: proj.college_name || cleanName,
        domain: proj.base_domain || domain,
        url: proj.sitemap_url || sitemapUrl,
        desc: `Assistant for ${proj.college_name || cleanName} — dynamic search on ${proj.base_domain || domain} with ${discoveredUrls.length || proj.total_urls || 0} discovered sitemap pages.`,
        urls: discoveredUrls.length ? discoveredUrls : [cleanUrl],
        samples: genericSamples(proj.college_name || cleanName, proj.base_domain || domain)
      };
    } catch (backendErr: any) {
      console.warn('Backend sitemap creation failed or offline, creating local profile:', backendErr);
      const fallbackKey = 'proj_' + Math.random().toString(36).slice(2, 10);
      newProject = {
        key: fallbackKey,
        name: cleanName,
        domain,
        url: sitemapUrl,
        desc: `Assistant for ${cleanName} — dynamic search on ${domain} with cited sources.`,
        urls: [sitemapUrl, cleanUrl],
        samples: genericSamples(cleanName, domain)
      };
    }

    // Save to local storage
    try {
      const saved = JSON.parse(localStorage.getItem('omniagent_projects') || '[]');
      saved.push({ key: newProject.key, name: newProject.name, domain: newProject.domain, url: newProject.url });
      localStorage.setItem('omniagent_projects', JSON.stringify(saved));
    } catch (e) {}

    setIsSubmitting(false);
    onProjectAdded(newProject);
    setName('');
    setUrl('');
    setError('');
    onClose();
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="ncm-title">
      <div className="modal-card">
        <div className="flex items-center justify-between px-5 py-4 border-b bd">
          <h2 id="ncm-title" className="font-bold text-sm">Add a website or sitemap</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-3)]"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            <div>
              <label htmlFor="ncm-name" className="form-label">Organization or College name</label>
              <input
                id="ncm-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input mt-1.5"
                placeholder="e.g. Poornima University, JECRC, Arya College"
                autoFocus
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="ncm-url" className="form-label">Website or Sitemap URL</label>
              <input
                id="ncm-url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="input mt-1.5"
                placeholder="https://www.example.com or https://www.example.com/sitemap.xml"
                inputMode="url"
                disabled={isSubmitting}
              />
              <p className="text-[11px] t3 mt-1.5">
                Enter your homepage or sitemap.xml. The assistant automatically reads your sitemap, indexes all pages, and enables dynamic web search.
              </p>
            </div>
            {error && (
              <p className="text-xs font-semibold text-[var(--danger)]" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 px-5 py-4 border-t bd sf2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-secondary btn-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary btn-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Ingesting sitemap…
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" /> Add website
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
