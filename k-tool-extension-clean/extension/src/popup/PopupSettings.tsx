import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Switch,
  Button,
  FormControlLabel,
  Alert,
  Divider,
  InputAdornment,
  Stack,
  CircularProgress,
  Chip,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Key as KeyIcon,
  Link as LinkIcon,
  Description as DocumentIcon,
  Storage as DatabaseIcon,
  Psychology as BrainIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  CloudDone as CloudDoneIcon,
  CloudSync as CloudSyncIcon,
  SmartToy as AIIcon
} from '@mui/icons-material';
import { extensionSettings } from '../enums/AppConstants';

export interface Settings {
  apiKey: string;
  urlTemplate: string;
  customPrompt: string;
  documentUrl: string;
  databaseUrl: string;
  instructionUrl: string;
  isEnabled: boolean;
  selectedModel: 'sonar-pro' | 'gemini';
}

const PopupSettings: React.FC = () => {  const [settings, setSettings] = useState<Settings>({
    apiKey: '',
    urlTemplate: '',
    customPrompt: '',
    documentUrl: '',
    databaseUrl: '',
    instructionUrl: '',
    isEnabled: true,
    selectedModel: 'sonar-pro'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errors, setErrors] = useState<Partial<Record<keyof Settings, string>>>({});
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Debounce function
  const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  // Load settings từ Chrome storage khi component mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Auto-save settings khi có thay đổi (debounced)
  const debouncedSave = useCallback(
    debounce(async (settingsToSave: Settings) => {
      if (isInitialLoad) return; // Không lưu trong lần load đầu tiên
      
      setSaveStatus('saving');
      setIsSaving(true);
      
      try {
        await chrome.storage.sync.set({ extensionSettings: settingsToSave });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('Error saving settings:', error);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } finally {
        setIsSaving(false);
      }
    }, 1000), // Delay 1 giây
    [isInitialLoad]
  );

  // Effect để auto-save khi settings thay đổi
  useEffect(() => {
    if (!isInitialLoad) {
      debouncedSave(settings);
    }
  }, [settings, debouncedSave, isInitialLoad]);

  const loadSettings = async () => {
    try {
      const result = await chrome.storage.sync.get([extensionSettings]);
      if (result.extensionSettings) {
        setSettings(result.extensionSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsInitialLoad(false);
    }
  };

  const handleInputChange = (field: keyof Settings, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error khi user bắt đầu nhập
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof Settings, string>> = {};
    
    if (!settings.apiKey?.trim()) {
      newErrors.apiKey = 'API Key là bắt buộc';
    }
    
    if (!settings.urlTemplate?.trim()) {
      newErrors.urlTemplate = 'URL Template là bắt buộc';
    } else if (!settings.urlTemplate.includes('{endpoint}')) {
      newErrors.urlTemplate = 'URL Template phải chứa {endpoint}';
    }
    
    if (!settings.documentUrl?.trim()) {
      newErrors.documentUrl = 'URL thư mục lưu tài liệu chi tiết';
    } else if (!validateUrl(settings.documentUrl)) {
      newErrors.documentUrl = 'URL không hợp lệ';
    }
    
    if (!settings.databaseUrl?.trim()) {
      newErrors.databaseUrl = 'URL thư mục lưu database';
    } else if (!validateUrl(settings.databaseUrl)) {
      newErrors.databaseUrl = 'URL không hợp lệ';
    }
    
    if (!settings.customPrompt?.trim()) {
      newErrors.customPrompt = 'Custom Prompt là bắt buộc';
    } else if (settings.customPrompt.trim().length < 10) {
      newErrors.customPrompt = 'Custom Prompt phải có ít nhất 10 ký tự';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getValidationErrors = () => {
    const errorList = [];
    if (!settings.apiKey?.trim()) errorList.push('API Key');
    if (!settings.urlTemplate?.trim()) errorList.push('URL Template');
    if (!settings.documentUrl?.trim()) errorList.push('URL Tài liệu');
    if (!settings.databaseUrl?.trim()) errorList.push('URL Database');
    if (!settings.customPrompt?.trim()) errorList.push('Custom Prompt AI');
    return errorList;
  };

  const isFormValid = () => {
    return settings.apiKey?.trim() && 
           settings.urlTemplate?.trim() && 
           settings.customPrompt?.trim() &&
           settings.documentUrl?.trim() &&
           settings.databaseUrl?.trim() &&
           (!settings.documentUrl || validateUrl(settings.documentUrl)) &&
           (!settings.databaseUrl || validateUrl(settings.databaseUrl));
  };

  const getSaveStatusIcon = () => {
    switch (saveStatus) {
      case 'saving':
        return <CloudSyncIcon color="primary" />;
      case 'saved':
        return <CloudDoneIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return null;
    }
  };

  const getSaveStatusText = () => {
    switch (saveStatus) {
      case 'saving':
        return 'Đang lưu...';
      case 'saved':
        return 'Đã lưu';
      case 'error':
        return 'Lỗi lưu';
      default:
        return '';
    }
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        width: 480, 
        maxHeight: 600, 
        overflow: 'auto',
        p: 3,
        borderRadius: 2
      }}
    >
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" fontWeight="bold" color="primary">
          Cài đặt K-Tool Document
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Chip 
            label={settings.isEnabled ? 'Bật' : 'Tắt'} 
            size="small"
            color={settings.isEnabled ? 'success' : 'default'}
            variant="outlined"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.isEnabled}
                onChange={(e) => handleInputChange('isEnabled', e.target.checked)}
                color="primary"
              />
            }
            label=""
          />
        </Box>
      </Box>

      {/* Save Status */}
      {saveStatus !== 'idle' && (
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          {getSaveStatusIcon()}
          <Typography variant="caption" color={saveStatus === 'error' ? 'error' : 'text.secondary'}>
            {getSaveStatusText()}
          </Typography>
          {saveStatus === 'saving' && <CircularProgress size={12} />}
        </Box>
      )}

      {/* Form Fields */}
      <Stack spacing={3}>        {/* API Key */}
        <TextField
          label="API Key"
          type="password"
          value={settings.apiKey}
          onChange={(e) => handleInputChange('apiKey', e.target.value)}
          placeholder="Nhập API key của bạn"
          required
          fullWidth
          error={!!errors.apiKey}
          helperText={errors.apiKey}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <KeyIcon color="primary" />
              </InputAdornment>
            ),
          }}
        />

        {/* Model Selection */}
        <FormControl fullWidth required>
          <InputLabel id="model-select-label">AI Model</InputLabel>
          <Select
            labelId="model-select-label"
            label="AI Model"
            value={settings.selectedModel}
            onChange={(e) => handleInputChange('selectedModel', e.target.value)}
            startAdornment={
              <InputAdornment position="start">
                <AIIcon color="secondary" />
              </InputAdornment>
            }
          >
            <MenuItem value="sonar-pro">
              <Box display="flex" alignItems="center" gap={1}>
                <Chip label="Perplexity" size="small" color="primary" variant="outlined" />
                <Typography>Sonar Pro</Typography>
              </Box>
            </MenuItem>
            <MenuItem value="gemini">
              <Box display="flex" alignItems="center" gap={1}>
                <Chip label="Google" size="small" color="secondary" variant="outlined" />
                <Typography>Gemini 2.0 Flash</Typography>
              </Box>
            </MenuItem>
          </Select>
        </FormControl>

        {/* URL Template */}
        <TextField
          label="URL Template"
          value={settings.urlTemplate}
          onChange={(e) => handleInputChange('urlTemplate', e.target.value)}
          placeholder=""
          required
          fullWidth
          error={!!errors.urlTemplate}
          helperText={errors.urlTemplate || "Link tài liệu template của dự án"}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LinkIcon color="secondary" />
              </InputAdornment>
            ),
          }}
        />

        {/* Document URL */}
        <TextField
          label="URL Tài liệu"
          type="url"
          value={settings.documentUrl}
          onChange={(e) => handleInputChange('documentUrl', e.target.value)}
          placeholder=""
          fullWidth
          error={!!errors.documentUrl}
          helperText={errors.documentUrl || "URL folder bạn đặt tài liệu chi tiết khi AI trả lời"}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <DocumentIcon color="success" />
              </InputAdornment>
            ),
          }}
        />

        {/* Database URL */}
        <TextField
          label="URL Folder database"
          type="url"
          value={settings.databaseUrl}
          onChange={(e) => handleInputChange('databaseUrl', e.target.value)}
          placeholder="https://api.database.com/v1/database-id"
          required
          fullWidth
          error={!!errors.databaseUrl}
          helperText={errors.databaseUrl || "Thư mục tài liệu các bảng trong database"}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <DatabaseIcon color="warning" />
              </InputAdornment>
            ),
          }}
        />

        {/* instructionUrl URL */}
        <TextField
          label="Url Custom Instructions"
          type="url"
          value={settings.instructionUrl}
          onChange={(e) => handleInputChange('instructionUrl', e.target.value)}
          placeholder="Url custom instructions"
          required
          fullWidth
          error={!!errors.instructionUrl}
          helperText={errors.instructionUrl || "Bổ sung thêm tài liệu hệ thống để AI hiểu rõ hơn về hệ thống của bạn"}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <DatabaseIcon color="warning" />
              </InputAdornment>
            ),
          }}
        />

        {/* Custom Prompt */}
        <TextField
          label="Custom Prompt AI"
          multiline
          rows={4}
          value={settings.customPrompt}
          onChange={(e) => handleInputChange('customPrompt', e.target.value)}
          placeholder="Nhập prompt tùy chỉnh cho AI..."
          required
          fullWidth
          error={!!errors.customPrompt}
          helperText={
            <Box>
              {errors.customPrompt && <Typography variant="caption" color="error">{errors.customPrompt}</Typography>}
              <Typography variant="caption" color="text.secondary" display="block">
                Prompt này sẽ được sử dụng làm ngữ cảnh cho AI
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Số ký tự: {settings.customPrompt?.length || 0}
              </Typography>
            </Box>
          }
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                <BrainIcon color="error" />
              </InputAdornment>
            ),
          }}
        />
      </Stack>

      {/* Footer */}
      <Divider sx={{ my: 2 }} />
      <Box textAlign="center">
        <Typography variant="caption" color="text.secondary">
          K-Tool Document v1.0 - Auto Save
        </Typography>
      </Box>
    </Paper>
  );
};

export default PopupSettings;
