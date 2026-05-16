'use client';

import { useState, type ReactNode } from 'react';
import { BarChart3, Check, FileText, HelpCircle, ShieldCheck, Wallet } from 'lucide-react';
import { ProjectQuestions, type ProjectQuestionItem } from '@/components/ProjectQuestions';

type Doc = { id: string; title: string; url: string; type?: string };

type Props = {
  lang: string;
  projectId: string;
  ownerId?: string;
  questions: ProjectQuestionItem[];
  summary: string;
  categoryLabel: string;
  location?: string;
  opportunityType?: string;
  price: string;
  roi: string;
  monthlyProfit: string;
  views: string;
  contacts: string;
  verified: boolean;
  ownerVerified: boolean;
  documents: Doc[];
};

type TabKey = 'overview' | 'financials' | 'trust' | 'documents' | 'questions';

export function ProjectDetailsTabs(props: Props) {
  const isAr = props.lang === 'ar';
  const [tab, setTab] = useState<TabKey>('overview');
  const tabs = [
    ['overview', isAr ? 'نبذة عن المشروع' : 'Overview', FileText],
    ['financials', isAr ? 'المؤشرات المالية' : 'Financials', Wallet],
    ['trust', isAr ? 'مؤشرات الثقة' : 'Trust', ShieldCheck],
    ['documents', isAr ? 'الوثائق' : 'Documents', FileText],
    ['questions', isAr ? 'الأسئلة' : 'Questions', HelpCircle],
  ] as const;

  const financialRows = [
    [isAr ? 'المبلغ المطلوب' : 'Required amount', props.price],
    [isAr ? 'العائد المتوقع' : 'Expected ROI', props.roi],
    [isAr ? 'الربح الشهري المتوقع' : 'Expected monthly profit', props.monthlyProfit],
    [isAr ? 'طلبات التواصل' : 'Contact requests', props.contacts],
  ].filter(([, value]) => value && value !== '0' && value !== '0%' && value !== 'ر.ع 0' && value !== '0 OMR');

  const trustRows = [
    [isAr ? 'حالة توثيق المشروع' : 'Project verification', props.verified ? (isAr ? 'موثق' : 'Verified') : (isAr ? 'غير موثق' : 'Not verified'), props.verified],
    [isAr ? 'توثيق صاحب المشروع' : 'Owner verification', props.ownerVerified ? (isAr ? 'موثق' : 'Verified') : (isAr ? 'غير موثق' : 'Not verified'), props.ownerVerified],
    [isAr ? 'الوثائق المرفقة' : 'Attached documents', props.documents.length ? `${props.documents.length}` : (isAr ? 'لا توجد' : 'None'), props.documents.length > 0],
  ];

  return (
    <section className="project-tab-card-v34">
      <div className="project-tabs-v34" role="tablist" aria-label={isAr ? 'تفاصيل المشروع' : 'Project details'}>
        {tabs.map(([key, label, Icon]) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={tab === key ? 'active' : ''}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      <div className="project-content-v34">
        {tab === 'overview' ? (
          <>
            <h2>{isAr ? 'نبذة عن المشروع' : 'Project overview'}</h2>
            <p>{props.summary || (isAr ? 'لم يضف صاحب المشروع نبذة بعد.' : 'No project overview has been added yet.')}</p>
            <div className="project-feature-grid-v34">
              <Feature label={isAr ? 'القطاع' : 'Sector'} value={props.categoryLabel} />
              {props.location ? <Feature label={isAr ? 'الموقع' : 'Location'} value={props.location} /> : null}
              <Feature label={isAr ? 'نوع الفرصة' : 'Opportunity type'} value={props.opportunityType || (isAr ? 'غير محدد' : 'Not specified')} />
              <Feature label={isAr ? 'المشاهدات' : 'Views'} value={props.views} />
            </div>
          </>
        ) : null}

        {tab === 'financials' ? (
          <>
            <h2>{isAr ? 'المؤشرات المالية' : 'Financial indicators'}</h2>
            {financialRows.length ? (
              <div className="project-tab-grid-v34">
                {financialRows.map(([label, value]) => <Feature key={label} label={label} value={value} icon={<BarChart3 size={18} />} />)}
              </div>
            ) : <Empty text={isAr ? 'لم تضف مؤشرات مالية كافية لهذا المشروع.' : 'No financial indicators have been added yet.'} />}
          </>
        ) : null}

        {tab === 'trust' ? (
          <>
            <h2>{isAr ? 'مؤشرات الثقة' : 'Trust indicators'}</h2>
            <div className="project-trust-list-v34">
              {trustRows.map(([label, value, ok]) => (
                <div key={String(label)}>
                  <span>{label}</span>
                  <b className={ok ? 'ok' : ''}>{value}</b>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {tab === 'documents' ? (
          <>
            <h2>{isAr ? 'الوثائق' : 'Documents'}</h2>
            {props.documents.length ? (
              <div className="project-doc-list-v34">
                {props.documents.map((doc) => (
                  <a key={doc.id} href={doc.url} target="_blank" rel="noreferrer">
                    <FileText size={18} />
                    <span>{doc.title}</span>
                    <small>{doc.type || (isAr ? 'ملف مرفق' : 'Attachment')}</small>
                  </a>
                ))}
              </div>
            ) : <Empty text={isAr ? 'لا توجد وثائق عامة مرفقة لهذا المشروع.' : 'No public documents are attached to this project.'} />}
          </>
        ) : null}

        {tab === 'questions' ? (
          <>
            <h2>{isAr ? 'الأسئلة' : 'Questions'}</h2>
            <ProjectQuestions projectId={props.projectId} ownerId={props.ownerId} initialQuestions={props.questions} lang={props.lang} />
          </>
        ) : null}
      </div>
    </section>
  );
}

function Feature({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return <div>{icon || <Check size={18} />}<span>{label}</span><b>{value}</b></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="project-empty-v34">{text}</div>;
}
