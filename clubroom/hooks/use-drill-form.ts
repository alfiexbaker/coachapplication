/**
 * useDrillForm — State, validation, and submission for drill form.
 */
import { useState, useCallback } from 'react';
import type { DrillCategory, DrillDifficulty, CreateDrillInput } from '@/constants/types';

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

interface UseDrillFormOptions {
  initialValues?: Partial<CreateDrillInput>;
  onSubmit: (values: CreateDrillInput) => void;
}

export function useDrillForm({ initialValues, onSubmit }: UseDrillFormOptions) {
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [category, setCategory] = useState<DrillCategory>(initialValues?.category ?? 'TECHNIQUE');
  const [difficulty, setDifficulty] = useState<DrillDifficulty>(
    initialValues?.difficulty ?? 'BEGINNER',
  );
  const [duration, setDuration] = useState(initialValues?.duration?.toString() ?? '15');
  const [videoUrl, setVideoUrl] = useState(initialValues?.videoUrl ?? '');
  const [equipment, setEquipment] = useState(initialValues?.equipment?.join(', ') ?? '');
  const [tags, setTags] = useState(initialValues?.tags?.join(', ') ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    const durationNum = parseInt(duration, 10);
    if (isNaN(durationNum) || durationNum < 1 || durationNum > 180)
      newErrors.duration = 'Duration must be between 1 and 180 minutes';
    if (videoUrl && !isValidUrl(videoUrl)) newErrors.videoUrl = 'Please enter a valid URL';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, description, duration, videoUrl]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;
    const values: CreateDrillInput = {
      title: title.trim(),
      description: description.trim(),
      category,
      difficulty,
      duration: parseInt(duration, 10),
      videoUrl: videoUrl.trim() || undefined,
      equipment: equipment.trim()
        ? equipment
            .split(',')
            .map((e) => e.trim())
            .filter(Boolean)
        : undefined,
      tags: tags.trim()
        ? tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
    };
    onSubmit(values);
  }, [
    title,
    description,
    category,
    difficulty,
    duration,
    videoUrl,
    equipment,
    tags,
    validate,
    onSubmit,
  ]);

  return {
    title,
    setTitle,
    description,
    setDescription,
    category,
    setCategory,
    difficulty,
    setDifficulty,
    duration,
    setDuration,
    videoUrl,
    setVideoUrl,
    equipment,
    setEquipment,
    tags,
    setTags,
    errors,
    handleSubmit,
  };
}
