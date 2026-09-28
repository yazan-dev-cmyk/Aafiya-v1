import React from 'react';
import { DoctorSettingsTab } from './DoctorSettingsTab';

interface ClinicWorkingHoursTabProps {
  isDarkMode?: boolean;
}

export const ClinicWorkingHoursTab: React.FC<ClinicWorkingHoursTabProps> = ({ isDarkMode = false }) => {
  return <DoctorSettingsTab isDarkMode={isDarkMode} defaultSubTab="working-hours" />;
};
