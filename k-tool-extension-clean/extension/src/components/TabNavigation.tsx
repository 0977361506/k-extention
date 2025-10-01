import React from 'react';
import DevDocTab from './confluence/DevDocTab';
import EnhancedPreviewTab from './confluence/EnhancedPreviewTab';
import EnhancedEditTab from './confluence/EnhancedEditTab';
import AdvancedEditTab from './confluence/AdvancedEditTab';
import BasicEditTab from './confluence/BasicEditTab';
import PlainTextEditTab from './confluence/PlainTextEditTab';
import { AppState } from '../types/types';

interface TabNavigationProps {
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
  isFullscreen?: boolean;
  isDarkMode?: boolean;
  isDialog?: boolean;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ 
  state, 
  updateState, 
  isFullscreen = false, 
  isDarkMode = false,
  isDialog = false
}) => {
  const renderContent = () => {
    switch (state.currentView) {
      case 'main':
        return <DevDocTab state={state} updateState={updateState} />;
      case 'preview':
        return <EnhancedPreviewTab state={state} updateState={updateState} />;
      case 'edit':
        return <EnhancedEditTab state={state} updateState={updateState} />;
      case 'advanced-edit':
        return <AdvancedEditTab state={state} updateState={updateState} />;
      case 'basic-edit':
        return <BasicEditTab state={state} updateState={updateState} />;
      case 'plain-text-edit':
        return <PlainTextEditTab state={state} updateState={updateState} />;
      default:
        return <DevDocTab state={state} updateState={updateState} />;
    }
  };
  return (
    <>{renderContent()}</>
  );
};

export default TabNavigation;