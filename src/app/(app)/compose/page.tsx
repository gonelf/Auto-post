'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SubredditSearch } from '@/components/posts/SubredditSearch';
import { ImageUploader } from '@/components/posts/ImageUploader';
import { showToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import type { PostType } from '@/types/post';

const schema = z
  .object({
    post_type: z.enum(['text', 'link', 'image']),
    title: z.string().min(1, 'Title is required').max(300, 'Max 300 characters'),
    subreddit: z.string().min(1, 'Subreddit is required').regex(/^[A-Za-z0-9_]+$/, 'Invalid subreddit'),
    body_text: z.string().max(40000).optional(),
    link_url: z.string().url('Enter a valid URL').optional().or(z.literal('')),
    image: z.object({ url: z.string(), key: z.string() }).optional(),
    schedule_type: z.enum(['now', 'later']),
    scheduled_date: z.string().optional(),
    scheduled_time: z.string().optional(),
    timezone: z.string(),
  })
  .refine(
    (data) => {
      if (data.post_type === 'link') return !!data.link_url;
      if (data.post_type === 'image') return !!data.image?.url;
      return true;
    },
    { message: 'Please provide the required content for this post type', path: ['post_type'] }
  );

type FormValues = z.infer<typeof schema>;

const postTypes: { value: PostType; label: string; icon: string }[] = [
  { value: 'text', label: 'Text', icon: '📝' },
  { value: 'link', label: 'Link', icon: '🔗' },
  { value: 'image', label: 'Image', icon: '🖼️' },
];

const userTimezone = typeof window !== 'undefined'
  ? Intl.DateTimeFormat().resolvedOptions().timeZone
  : 'UTC';

export default function ComposePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      post_type: 'text',
      schedule_type: 'now',
      timezone: userTimezone,
      scheduled_date: format(new Date(), 'yyyy-MM-dd'),
      scheduled_time: format(new Date(Date.now() + 60 * 60_000), 'HH:mm'),
    },
  });

  const postType = watch('post_type');
  const scheduleType = watch('schedule_type');
  const title = watch('title') || '';

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      let scheduledAt: string | undefined;
      if (values.schedule_type === 'later' && values.scheduled_date && values.scheduled_time) {
        const localDatetime = `${values.scheduled_date}T${values.scheduled_time}:00`;
        const utcDate = fromZonedTime(new Date(localDatetime), values.timezone);
        scheduledAt = utcDate.toISOString();
      }

      const payload = {
        post_type: values.post_type,
        title: values.title,
        subreddit: values.subreddit,
        body_text: values.post_type === 'text' ? values.body_text : undefined,
        link_url: values.post_type === 'link' ? values.link_url : undefined,
        image_url: values.post_type === 'image' ? values.image?.url : undefined,
        image_storage_key: values.post_type === 'image' ? values.image?.key : undefined,
        scheduled_at: scheduledAt,
      };

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create post');
      }

      showToast(
        values.schedule_type === 'now'
          ? 'Post queued — will be submitted within 60 seconds'
          : 'Post scheduled successfully',
        'success'
      );
      router.push('/dashboard');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create post', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <TopBar title="Compose" />
      <main className="flex-1 p-6 pb-20 md:pb-6">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Create a Post</h2>

            {/* Post Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Post Type</label>
              <Controller
                name="post_type"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-2">
                    {postTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => field.onChange(type.value)}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors',
                          field.value === type.value
                            ? 'border-reddit-orange bg-orange-50 text-reddit-orange'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        )}
                      >
                        {type.icon} {type.label}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            {/* Title */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Title</label>
                <span className={cn('text-xs', title.length > 290 ? 'text-red-500' : 'text-gray-400')}>
                  {title.length}/300
                </span>
              </div>
              <input
                {...register('title')}
                placeholder="Post title"
                maxLength={300}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
                  errors.title
                    ? 'border-red-400 focus:ring-red-500'
                    : 'border-gray-200 focus:border-reddit-orange focus:ring-reddit-orange',
                  'focus:ring-1'
                )}
              />
              {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
            </div>

            {/* Subreddit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subreddit</label>
              <Controller
                name="subreddit"
                control={control}
                render={({ field }) => (
                  <SubredditSearch
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.subreddit?.message}
                  />
                )}
              />
            </div>

            {/* Post content — conditional */}
            {postType === 'text' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Body (optional)</label>
                <textarea
                  {...register('body_text')}
                  rows={6}
                  placeholder="Write your post content here (markdown supported)"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-reddit-orange focus:ring-1 focus:ring-reddit-orange resize-y"
                />
              </div>
            )}

            {postType === 'link' && (
              <Input
                {...register('link_url')}
                label="URL"
                type="url"
                placeholder="https://example.com"
                error={errors.link_url?.message}
              />
            )}

            {postType === 'image' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Image</label>
                <Controller
                  name="image"
                  control={control}
                  render={({ field }) => (
                    <ImageUploader value={field.value} onChange={field.onChange} />
                  )}
                />
                {errors.post_type && (
                  <p className="mt-1 text-xs text-red-600">{errors.post_type.message}</p>
                )}
              </div>
            )}

            {/* Scheduling */}
            <div className="border-t border-gray-100 pt-5">
              <label className="block text-sm font-medium text-gray-700 mb-3">When to post</label>
              <div className="space-y-2">
                <Controller
                  name="schedule_type"
                  control={control}
                  render={({ field }) => (
                    <>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          value="now"
                          checked={field.value === 'now'}
                          onChange={() => field.onChange('now')}
                          className="accent-reddit-orange"
                        />
                        <span className="text-sm text-gray-700">Post now (within ~60 seconds)</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          value="later"
                          checked={field.value === 'later'}
                          onChange={() => field.onChange('later')}
                          className="accent-reddit-orange"
                        />
                        <span className="text-sm text-gray-700">Schedule for later</span>
                      </label>
                    </>
                  )}
                />

                {scheduleType === 'later' && (
                  <div className="mt-3 flex flex-wrap gap-3 pl-7">
                    <Input
                      {...register('scheduled_date')}
                      type="date"
                      className="w-auto"
                    />
                    <Input
                      {...register('scheduled_time')}
                      type="time"
                      className="w-auto"
                    />
                    <div>
                      <select
                        {...register('timezone')}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-reddit-orange focus:ring-1 focus:ring-reddit-orange"
                      >
                        {Intl.supportedValuesOf('timeZone').map((tz) => (
                          <option key={tz} value={tz}>{tz}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                {scheduleType === 'now' ? 'Post Now' : 'Schedule Post'}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
