import { supabaseAdmin } from '@/lib/supabase-admin';
import { ProjectReelsExperience } from '@/components/ProjectReelsExperience';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = Promise<{ country: string; lang: string }>;

function normalizeVideoUrl(raw: unknown) {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (/^(https?:|blob:|data:)/i.test(value)) return value;

  const cleanPath = value
    .replace(/^project-videos\//, '')
    .replace(/^\/storage\/v1\/object\/public\/project-videos\//, '');

  try {
    return supabaseAdmin.storage.from('project-videos').getPublicUrl(cleanPath).data.publicUrl;
  } catch {
    return value;
  }
}

function pickVideoUrl(row: any) {
  return normalizeVideoUrl(row?.video_url || row?.file_url || row?.url || row?.path || row?.public_url);
}

async function loadProjectVideos() {
  // لا نستخدم join هنا لأن بعض قواعد البيانات لا تحتوي FK بين project_videos و projects،
  // وهذا كان سبب اختفاء الريلز بالكامل.
  const baseColumns = '*';

  const first = await supabaseAdmin
    .from('project_videos')
    .select(baseColumns)
    .order('created_at', { ascending: false })
    .limit(100);

  if (!first.error) return first.data || [];

  // fallback لو جدول project_videos لا يحتوي created_at أو sort_order
  const fallback = await supabaseAdmin.from('project_videos').select(baseColumns).limit(100);
  if (!fallback.error) return fallback.data || [];

  console.warn('Project reels videos unavailable:', first.error?.message || fallback.error?.message);
  return [];
}

async function loadProjectsByIds(ids: string[]) {
  if (!ids.length) return new Map<string, any>();

  const { data, error } = await supabaseAdmin.from('projects').select('*').in('id', ids);
  if (error) {
    console.warn('Project reels projects unavailable:', error.message);
    return new Map<string, any>();
  }

  return new Map((data || []).map((project: any) => [String(project.id), project]));
}

export default async function ProjectReelsPage({ params }: { params: Params }) {
  const { country, lang } = await params;
  let items: any[] = [];

  try {
    const videos = await loadProjectVideos();
    const projectIds = Array.from(
      new Set(
        (videos || [])
          .map((row: any) => String(row.project_id || row.projectId || '').trim())
          .filter(Boolean)
      )
    );
    const projectsMap = await loadProjectsByIds(projectIds);

    items = (videos || [])
      .map((row: any) => {
        const projectId = String(row.project_id || row.projectId || '').trim();
        const project = projectsMap.get(projectId) || null;
        const videoUrl = pickVideoUrl(row);

        return {
          id: String(row.id || `${projectId}-${videoUrl}`),
          videoUrl,
          title: row.title || row.file_name || row.name || project?.title || project?.title_ar || project?.title_en,
          fileName: row.file_name || row.name,
          projectId: projectId || project?.id,
          likesCount: Number(row.likes_count || row.likes || 0),
          sharesCount: Number(row.shares_count || row.shares || 0),
          contactsCount: Number(row.contacts_count || row.contacts || 0),
          isActive: row.is_active,
          project,
        };
      })
      .filter((row: any) => {
        if (!row.videoUrl) return false;
        if (row.isActive === false) return false;

        // فلترة مرنة جدًا حتى لا تختفي الفيديوهات بسبب بيانات قديمة أو مشروع غير مربوط.
        const project = row.project || {};
        const code = String(project.country_code || '').toLowerCase();
        const status = String(project.status || project.moderation_status || '').toLowerCase();
        const countryOk = !code || code === country.toLowerCase();
        const statusOk = !status || ['approved', 'active', 'published', 'منشور'].includes(status);
        return countryOk && statusOk;
      });
  } catch (error) {
    console.warn('Project reels unavailable:', error);
  }

  return <ProjectReelsExperience country={country} lang={lang} items={items} />;
}
