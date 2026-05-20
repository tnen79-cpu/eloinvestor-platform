export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BadgeCheck, BriefcaseBusiness, CalendarDays, Camera, CheckCircle2, Eye, MapPin, MessageCircle, Phone, Star, UserPlus, Users } from 'lucide-react';
import { ShareProfileButton } from '@/components/ShareProfileButton';
import { ProjectCard } from '@/components/ProjectCard';
import { FollowUserButton } from '@/components/FollowUserButton';
import { formatDate, getCountryByCode, getUserProfileById, getUserProjects, getUserRatings, roleLabel } from '@/lib/server-data';

function maskPhone(value?: string) {
  const clean = String(value || '').replace(/\D/g, '');
  if (!clean) return '';
  if (clean.length <= 4) return `${clean.slice(0, 2)}XX`;
  return `${clean.slice(0, 5)}${'X'.repeat(Math.min(4, clean.length - 5))}`;
}

function stars(rating: number) {
  const full = Math.round(Math.max(0, Math.min(5, rating || 0)));
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

export default async function UserProfilePage({ params }: { params: Promise<{ country: string; lang: string; id: string }> }) {
  const { country, lang, id } = await params;
  const isAr = lang === 'ar';
  const activeCountry = await getCountryByCode(country);
  const profile = await getUserProfileById(id);
  if (!profile) notFound();

  const ownerKey = profile.authId || profile.id;
  const [projects, ratings] = await Promise.all([
    getUserProjects(ownerKey, undefined, 24),
    getUserRatings(ownerKey),
  ]);

  const displayRole = roleLabel(profile.accountType || profile.role, lang);
  const initials = profile.name?.trim()?.slice(0, 2) || 'إم';
  const isVerified = profile.verificationStatus === 'approved' || profile.trustScore >= 70;
  const avgRating = profile.averageRating || (ratings.length ? ratings.reduce((sum, item) => sum + item.rating, 0) / ratings.length : 0);
  const ratingCount = profile.ratingsCount || ratings.length;
  const publicPhone = maskPhone(profile.whatsapp || profile.phone);
  const skills = (profile.skills || []).slice(0, 8);

  return (
    <main className="profile-pro-page">
      <div className="profile-pro-breadcrumb">
        <Link href={`/${activeCountry.code}/${lang}`}>{isAr ? 'الرئيسية' : 'Home'}</Link>
        <span>/</span>
        <Link href={`/${activeCountry.code}/${lang}/opportunities`}>{isAr ? 'المستثمرون' : 'Investors'}</Link>
        <span>/</span>
        <b>{profile.name}</b>
      </div>

      <section className="profile-pro-hero">
        <div className="profile-pro-cover">
          <div className="profile-pro-actions">
            {publicPhone ? <a className="profile-phone" href={`tel:${profile.whatsapp || profile.phone}`}>{publicPhone} <Phone size={16} /></a> : null}
            <ShareProfileButton name={profile.name || ''} lang={lang} />
            <FollowUserButton profileAuthId={ownerKey} lang={lang} />
          </div>
          <div className="profile-pro-identity">
            <div className="profile-pro-avatar">
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt={profile.name} /> : <span>{initials}</span>}
              <span className="profile-camera"><Camera size={16} /></span>
            </div>
            <div>
              <h1>{profile.name} {isVerified ? <BadgeCheck className="verified-blue-inline" size={24} fill="#1877f2" /> : null}</h1>
              <p>{profile.bio || (isAr ? 'مستخدم في إلو مستثمر، مهتم بالفرص الاستثمارية والمشاريع الواعدة.' : 'EloInvestor member interested in investment opportunities and promising projects.')}</p>
              <div className="profile-rating-line">
                <b>{avgRating ? avgRating.toFixed(1) : '—'}</b>
                <span className="profile-stars-gold">{stars(avgRating)}</span>
                <small>({ratingCount} {isAr ? 'التقييمات' : 'ratings'})</small>
              </div>
              <div className="profile-count-line">
                <b>{profile.profileViewsCount ? `${profile.profileViewsCount.toLocaleString()} ` : '— '}</b>{isAr ? 'مشاهدات' : 'views'}
                <span>|</span>
                <b>{profile.followersCount}</b> {isAr ? 'متابع' : 'followers'}
              </div>
            </div>
          </div>
        </div>

        <div className="profile-pro-meta">
          <ProfileMeta icon={MapPin} label={isAr ? 'الموقع' : 'Location'} value={profile.location || `${activeCountry.flag} ${isAr ? activeCountry.nameAr : activeCountry.nameEn}`} />
          <ProfileMeta icon={Users} label={isAr ? 'نوع الحساب' : 'Account type'} value={displayRole} />
          <ProfileMeta icon={CalendarDays} label={isAr ? 'عضو منذ' : 'Member since'} value={formatDate(profile.createdAt, lang)} />
          <ProfileMeta icon={CheckCircle2} label={isAr ? 'حالة الحساب' : 'Status'} value={isVerified ? (isAr ? 'موثق' : 'Verified') : (isAr ? 'غير موثق' : 'Unverified')} />
        </div>
      </section>

      <nav className="profile-tabs-real">
        <a className="active">{isAr ? 'الملف الشخصي' : 'Profile'}</a>
        <a>{isAr ? `المشاريع (${projects.length})` : `Projects (${projects.length})`}</a>
        <a>{isAr ? `التقييمات (${ratingCount})` : `Ratings (${ratingCount})`}</a>
        <a>{isAr ? `المتابعون (${profile.followersCount})` : `Followers (${profile.followersCount})`}</a>
        <a>{isAr ? 'النشاط' : 'Activity'}</a>
      </nav>

      <section className="profile-pro-layout">
        <aside className="profile-pro-side">
          <ProfileBox title={isAr ? 'نبذة عني' : 'About'} icon="👤">
            <p>{profile.bio || (isAr ? 'لم يضف المستخدم نبذة بعد.' : 'No bio has been added yet.')}</p>
            <ul className="profile-info-list">
              <li><MapPin size={16} /> {profile.location || (isAr ? activeCountry.nameAr : activeCountry.nameEn)}</li>
              <li><Users size={16} /> {displayRole}</li>
              <li><BadgeCheck size={16} /> {isVerified ? (isAr ? 'موثق' : 'Verified') : (isAr ? 'غير موثق' : 'Unverified')}</li>
              <li><CalendarDays size={16} /> {isAr ? 'انضم منذ' : 'Joined'} {formatDate(profile.createdAt, lang)}</li>
            </ul>
          </ProfileBox>

          <ProfileBox title={isAr ? 'القطاعات المهتم بها' : 'Interested sectors'} icon="💼">
            {skills.length ? <div className="profile-skill-list">{skills.map((skill) => <span key={skill}>{skill}</span>)}</div> : <p>{isAr ? 'لم يتم تحديد قطاعات بعد.' : 'No sectors selected yet.'}</p>}
          </ProfileBox>

          <ProfileBox title={isAr ? 'إحصائيات الحساب' : 'Account stats'} icon="📊">
            <div className="profile-stats-mini">
              <MiniStat icon={Eye} label={isAr ? 'المشاهدات' : 'Views'} value={profile.profileViewsCount || 0} />
              <MiniStat icon={UserPlus} label={isAr ? 'المتابعون' : 'Followers'} value={profile.followersCount} />
              <MiniStat icon={BriefcaseBusiness} label={isAr ? 'المشاريع' : 'Projects'} value={projects.length || profile.projectsCount} />
              <MiniStat icon={Star} label={isAr ? 'التقييمات' : 'Ratings'} value={ratingCount} />
            </div>
          </ProfileBox>
        </aside>

        <div className="profile-pro-content">
          <section className="profile-content-card">
            <div className="profile-section-head-real">
              <h2>{isAr ? 'مشاريعي' : 'Projects'}</h2>
              <Link href={`/${activeCountry.code}/${lang}/opportunities`}>{isAr ? 'عرض جميع المشاريع' : 'View all projects'} ‹</Link>
            </div>
            {projects.length ? (
              <div className="profile-projects-grid-real">
                {projects.map((project) => <ProjectCard key={project.id || project.slug} project={project} lang={lang} country={activeCountry} />)}
              </div>
            ) : <div className="profile-empty-real">{isAr ? 'لا توجد مشاريع منشورة لهذا المستخدم حالياً.' : 'No published projects for this user yet.'}</div>}
          </section>

          <section className="profile-content-card">
            <div className="profile-section-head-real">
              <h2>{isAr ? 'آخر التقييمات' : 'Latest ratings'}</h2>
              <span>{ratingCount} {isAr ? 'تقييم' : 'ratings'}</span>
            </div>
            {ratings.length ? (
              <div className="profile-reviews-grid-real">
                {ratings.slice(0, 6).map((rating) => <article key={rating.id} className="profile-review-real"><div><strong>{rating.rating.toFixed(1)}</strong><span>{stars(rating.rating)}</span></div><p>{rating.comment || (isAr ? 'تقييم بدون تعليق.' : 'Rating without comment.')}</p><small>{rating.reviewerName} · {rating.projectTitle}</small></article>)}
              </div>
            ) : <div className="profile-empty-real">{isAr ? 'لا توجد تقييمات منشورة بعد.' : 'No published ratings yet.'}</div>}
          </section>
        </div>
      </section>
    </main>
  );
}

function ProfileMeta({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return <div><Icon size={20} /><span>{label}</span><b>{value}</b></div>;
}

function ProfileBox({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return <article className="profile-box-real"><h3><span>{icon}</span>{title}</h3>{children}</article>;
}

function MiniStat({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return <div><Icon size={18} /><b>{value}</b><span>{label}</span></div>;
}
