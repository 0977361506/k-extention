import React, { useState, useEffect } from 'react';
import {
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Badge,
  Tooltip,
  useTheme,
  useMediaQuery,
  Box,
  Zoom,
  Paper
} from '@mui/material';
import {
  Close as CloseIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import KToolPopup from './KToolPopup';
import { Settings } from '../../popup/PopupSettings';

const KToolBubble: React.FC = () => {
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [isPopupMounted, setIsPopupMounted] = useState(false); // Controls if popup is ever mounted
    
    // Debug state changes
    useEffect(() => {
        console.log('🔧 K-tool: Popup state changed to:', isPopupOpen);
    }, [isPopupOpen]);
    
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    
    const [settings, setSettings] = useState<Settings>({
        apiKey: '',
        selectedModel: 'gemini',
        urlTemplate: '',
        customPrompt: '',
        documentUrl: '',
        databaseUrl: '',
        instructionUrl: '',
        isEnabled: true
    });

    useEffect(() => {
        loadSettings();
        console.log('🔧 K-tool: KToolBubble component mounted');
    }, []);

    const loadSettings = async () => {
        try {
            const result = await chrome.storage.sync.get(['extensionSettings']);
            if (result.extensionSettings) {
                setSettings(result.extensionSettings);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    const handleTogglePopup = () => {
        console.log('🔧 K-tool: Toggle popup clicked, current state:', isPopupOpen);
        const newState = !isPopupOpen;
        setIsPopupOpen(newState);
        
        // Mark popup as mounted if it's being opened for the first time
        if (newState && !isPopupMounted) {
            setIsPopupMounted(true);
        }
        
        console.log('🔧 K-tool: New popup state will be:', newState);
    };

    const handleClosePopup = () => {
        console.log('🔧 K-tool: Close popup clicked');
        setIsPopupOpen(false);
    };

    if (!settings.isEnabled) {
        return null;
    }

    return (
        <>
            {/* Modern MUI Floating Action Button with K icon */}
            <Tooltip 
                title={
                    <Box>
                        <Typography variant="body2" component="div">
                            K-tool Document Assistant
                        </Typography>
                        {!settings.apiKey && (
                            <Typography variant="caption" color="warning.main">
                                ⚠️ API Key cần được cấu hình
                            </Typography>
                        )}
                    </Box>
                }
                placement="left"
                arrow
            >
                <Badge
                    badgeContent={!settings.apiKey ? <WarningIcon sx={{ fontSize: 16 }} /> : null}
                    color="warning"
                    overlap="circular"
                    anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                    }}
                >
                    <Zoom in={true} timeout={500}>
                        <Fab
                            onClick={handleTogglePopup}
                            sx={{
                                position: 'fixed',
                                bottom: isMobile ? 20 : 30,
                                right: isMobile ? 20 : 30,
                                width: isMobile ? 56 : 64,
                                height: isMobile ? 56 : 64,
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                fontSize: isMobile ? '24px' : '28px',
                                fontWeight: 900,
                                fontFamily: '"Arial Black", Arial, sans-serif',
                                textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                                boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3), 0 4px 16px rgba(118, 75, 162, 0.2)',
                                border: '2px solid rgba(255, 255, 255, 0.9)',
                                zIndex: 1000,
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                                    transform: 'scale(1.05) translateY(-2px)',
                                    boxShadow: '0 12px 40px rgba(102, 126, 234, 0.4), 0 6px 20px rgba(118, 75, 162, 0.3)',
                                    borderColor: 'rgba(255, 255, 255, 1)',
                                },
                                '&:active': {
                                    transform: 'scale(0.98)',
                                },
                            }}
                        >
                            K
                        </Fab>
                    </Zoom>
                </Badge>
            </Tooltip>

            {/* Modern MUI Dialog for Popup - Always mounted after first open to preserve state */}
            {isPopupMounted && (
                <Dialog
                    open={isPopupOpen}
                    onClose={handleClosePopup}
                    fullScreen
                    
                >
                    <DialogTitle
                        sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            padding: '16px 24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box
                                sx={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    background: 'rgba(255, 255, 255, 0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '20px',
                                    fontWeight: 900,
                                    fontFamily: '"Arial Black", Arial, sans-serif',
                                }}
                            >
                                K
                            </Box>
                            <Box>
                                <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                                    K-tool Document Assistant
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                    AI-Powered Documentation & Analysis
                                </Typography>
                            </Box>
                        </Box>
                        
                        <IconButton
                            onClick={handleClosePopup}
                            sx={{
                                color: 'white',
                                '&:hover': {
                                    background: 'rgba(255, 255, 255, 0.1)',
                                }
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>

                    <DialogContent 
                        sx={{ 
                            padding: 0,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'auto',
                            '&::-webkit-scrollbar': {
                                width: '8px',
                            },
                            '&::-webkit-scrollbar-track': {
                                background: '#f1f1f1',
                                borderRadius: '4px',
                            },
                            '&::-webkit-scrollbar-thumb': {
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                borderRadius: '4px',
                            },
                            '&::-webkit-scrollbar-thumb:hover': {
                                background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                            },
                        }}
                    >
                        <KToolPopup 
                            isOpen={isPopupOpen} 
                            onClose={handleClosePopup}
                            isDialog={true}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
};

export default KToolBubble;