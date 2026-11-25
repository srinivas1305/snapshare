'use client';

import { useState } from 'react';
import FaceCropAvatar from './FaceCropAvatar';
import type { SmartAlbumPerson, SmartAlbumCategory } from '@/lib/smart-albums';

interface SmartAlbumsSectionProps {
  people: SmartAlbumPerson[];
  categories: SmartAlbumCategory[];
  activeAlbumId: string | null;
  onSelectAlbum: (albumId: string | null, photoIds: string[] | null) => void;
  editable?: boolean;
  occasionId?: string;
  onRenamed?: () => void;
  accentColor?: string;
}

export default function SmartAlbumsSection({
  people,
  categories,
  activeAlbumId,
  onSelectAlbum,
  editable = false,
  occasionId,
  onRenamed,
  accentColor = '#18181b',
}: SmartAlbumsSectionProps) {
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);

  if (people.length === 0 && categories.length === 0) {
    return null;
  }

  const startEdit = (person: SmartAlbumPerson) => {
    setEditingPersonId(person.id);
    setNameInput(person.name);
  };

  const saveName = async (person: SmartAlbumPerson) => {
    if (!occasionId || !nameInput.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/occasions/${occasionId}/albums`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumId: person.albumId,
          name: nameInput.trim(),
          centroid: person.centroid,
          coverPhotoId: person.coverPhotoId,
        }),
      });
      if (res.ok) {
        setEditingPersonId(null);
        onRenamed?.();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-6 pb-5 border-b border-neutral-100 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
          Smart albums
        </p>
        {activeAlbumId && (
          <button
            onClick={() => onSelectAlbum(null, null)}
            className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            Reset filter
          </button>
        )}
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => onSelectAlbum(null, null)}
          className={`text-xs px-3 py-1.5 rounded border transition-colors duration-150 ${
            activeAlbumId === null
              ? 'text-white border-transparent'
              : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-400'
          }`}
          style={activeAlbumId === null ? { backgroundColor: accentColor } : undefined}
        >
          All photos
        </button>
        {categories.map((cat) => {
          const isActive = activeAlbumId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectAlbum(cat.id, cat.photoIds)}
              className={`text-xs px-3 py-1.5 rounded border transition-colors duration-150 ${
                isActive
                  ? 'text-white border-transparent'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-400'
              }`}
              style={isActive ? { backgroundColor: accentColor } : undefined}
              title={cat.description}
            >
              {cat.name}
              <span className={`ml-1.5 font-mono text-[10px] ${isActive ? 'text-white/75' : 'text-neutral-400'}`}>
                {cat.photoCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* People clusters */}
      {people.length > 0 && (
        <div>
          <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-2">
            People ({people.length})
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {people.map((person) => {
              const isActive = activeAlbumId === person.id;
              const isEditing = editingPersonId === person.id;

              return (
                <div
                  key={person.id}
                  className={`flex items-center gap-2.5 p-1.5 pr-3 rounded border shrink-0 transition-colors duration-150 ${
                    isActive
                      ? 'border-neutral-900 bg-neutral-50'
                      : 'border-neutral-200 bg-white hover:border-neutral-400'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectAlbum(person.id, person.photoIds)}
                    className="flex items-center gap-2.5 text-left"
                  >
                    <FaceCropAvatar
                      imagePath={person.coverThumbnailPath || person.coverOriginalPath}
                      box={person.faceBox}
                      label={person.name}
                      size={36}
                    />
                    <div className="min-w-0">
                      {!isEditing && (
                        <>
                          <p className="text-xs font-medium text-neutral-900 truncate max-w-[110px]">
                            {person.name}
                          </p>
                          <p className="text-[10px] font-mono text-neutral-400">
                            {person.photoCount} photo{person.photoCount === 1 ? '' : 's'}
                          </p>
                        </>
                      )}
                    </div>
                  </button>

                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveName(person)}
                        className="w-24 px-1.5 py-0.5 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-neutral-900"
                        autoFocus
                      />
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => saveName(person)}
                        className="text-[10px] font-mono bg-neutral-900 text-white px-1.5 py-1 rounded"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPersonId(null)}
                        className="text-[10px] text-neutral-400 px-1"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    editable && (
                      <button
                        type="button"
                        onClick={() => startEdit(person)}
                        title="Name person"
                        className="text-[10px] font-mono text-neutral-400 hover:text-neutral-900 ml-1 transition-colors"
                      >
                        Edit
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
