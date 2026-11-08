'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  FileCheck2,
  Coins,
  ShieldAlert,
  Sliders
} from 'lucide-react';
import { RewardsOverviewTab } from './RewardsOverviewTab';
import { AssistantsLedgerTab } from './AssistantsLedgerTab';
import { ProfilesVerificationTab } from './ProfilesVerificationTab';
import { PayoutBatchesTab } from './PayoutBatchesTab';
import { AuditAndLossesTab } from './AuditAndLossesTab';
import { RewardSettingsTab } from './RewardSettingsTab';

type TabKey = 'overview' | 'settings' | 'assistants' | 'profiles' | 'batches' | 'audit';

export function AssistantRewardsManagement() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'overview', label: 'لوحة القيادة والمؤشرات', icon: LayoutDashboard },
    { key: 'settings', label: 'إعدادات وسياسة المكافآت', icon: Sliders },
    { key: 'assistants', label: 'دليل المساعدين وكشف الحساب', icon: Users },
    { key: 'profiles', label: 'تدقيق واعتماد الحسابات (RIP)', icon: FileCheck2 },
    { key: 'batches', label: 'دفعات المستحقات الشهرية', icon: Coins },
    { key: 'audit', label: 'التدقيق الأمني والخسائر', icon: ShieldAlert },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-l from-teal-800 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-200 border border-teal-500/30 mb-3">
              <span>إدارة المنظومة المالية</span>
              <span>•</span>
              <span>مكافآت مساعدي الأطباء P2</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              إدارة مكافآت مساعدي الأطباء
            </h1>
            <p className="text-teal-100 text-sm mt-1 max-w-2xl leading-relaxed">
              الإشراف على الأرصدة المالية لمساعدي العيادات، تدقيق الحسابات البنكية (RIP)، إدارة دفعات التحويل الشهرية، وسجلات التدقيق المالي والأمني.
            </p>
          </div>
        </div>

        {/* Tab Navigation Navigation Pills */}
        <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-teal-700/50">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-white text-teal-900 shadow-md transform -translate-y-0.5'
                    : 'text-teal-100 hover:bg-teal-700/50 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-700' : 'text-teal-200'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'overview' && (
          <RewardsOverviewTab onNavigateTab={(tab) => setActiveTab(tab as TabKey)} />
        )}
        {activeTab === 'settings' && <RewardSettingsTab />}
        {activeTab === 'assistants' && <AssistantsLedgerTab />}
        {activeTab === 'profiles' && <ProfilesVerificationTab />}
        {activeTab === 'batches' && <PayoutBatchesTab />}
        {activeTab === 'audit' && <AuditAndLossesTab />}
      </div>
    </div>
  );
}

export default AssistantRewardsManagement;