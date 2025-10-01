import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  IconButton,
  Typography,
  Toolbar,
  AppBar,
  Switch,
  FormControlLabel,
  Tooltip,
  Fade,
  useTheme,
  useMediaQuery,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Button,
  Stack
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Home as HomeIcon,
  Description as DocumentIcon,
  Code as CodeIcon,
  Preview as PreviewIcon,
  Edit as EditIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { AppState } from '../../types/types';
import TabNavigation from '../TabNavigation';

interface KToolPopupProps {
    isOpen: boolean;
    onClose: () => void;
    isDialog?: boolean;
}

const KToolPopup: React.FC<KToolPopupProps> = ({ isOpen, onClose, isDialog = false }) => {
    const [state, setState] = useState<AppState>({
        currentView: 'main',
        currentTab: 'dev-doc',
        previewMode: 'preview',
        generatedContent: '',
        isGenerating: false,
        baDocUrl: '',
        hasUnsavedChanges: false,
    });

    const [isFullscreen, setIsFullscreen] = useState(true); // Always start fullscreen
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [currentMainTab, setCurrentMainTab] = useState(0);
    const [isStateLoaded, setIsStateLoaded] = useState(false);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Create dynamic theme based on dark mode
    const muiTheme = createTheme({
        palette: {
            mode: isDarkMode ? 'dark' : 'light',
            primary: {
                main: '#667eea',
            },
            secondary: {
                main: '#764ba2',
            },
            background: {
                default: isDarkMode ? '#1a1a1a' : '#f8fafc',
                paper: isDarkMode ? '#2d3748' : '#ffffff',
            },
        },
        typography: {
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        },
        shape: {
            borderRadius: 12,
        },
    });

    useEffect(() => {
        // Load only theme preference on component mount
        const loadTheme = async () => {
            try {
                const result = await chrome.storage.sync.get(['darkMode']);
                if (result.darkMode !== undefined) {
                    setIsDarkMode(result.darkMode);
                }
            } catch (error) {
                console.error('Error loading theme:', error);
            }
        };
        
        loadTheme();
        setIsStateLoaded(true);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isFullscreen) {
                event.preventDefault();
                setIsFullscreen(false);
            }
            if (event.key === 'F11') {
                event.preventDefault();
                setIsFullscreen(!isFullscreen);
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, isFullscreen]);

    const updateState = (updates: Partial<AppState>) => {
        setState(prev => ({ ...prev, ...updates }));
    };

    const handleClose = () => {
        // Reset state when closing - no longer preserving it
        setState({
            currentView: 'main',
            currentTab: 'dev-doc',
            previewMode: 'preview',
            generatedContent: '',
            isGenerating: false,
            baDocUrl: '',
            hasUnsavedChanges: false,
        });
        setCurrentMainTab(0);
        onClose();
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    const toggleTheme = async () => {
        const newTheme = !isDarkMode;
        setIsDarkMode(newTheme);
        try {
            await chrome.storage.sync.set({ darkMode: newTheme });
        } catch (error) {
            console.error('Error saving theme:', error);
        }
    };

    const getViewTitle = () => {
        switch(state.currentView) {
            case 'settings': return 'Cài đặt';
            case 'main': return 'K-Tool Assistant';
            case 'preview': return 'Xem trước';
            case 'edit': return 'Chỉnh sửa';
            default: return 'K-Tool Assistant';
        }
    };

    const getMainTabIcon = (index: number) => {
        switch(index) {
            case 0: return <HomeIcon />;
            case 1: return <DocumentIcon />;
            case 2: return <CodeIcon />;
            case 3: return <PreviewIcon />;
            default: return <HomeIcon />;
        }
    };

    const renderCurrentView = () => {
        switch(state.currentView) {
            case 'settings':
                return (
                    <Container 
                        maxWidth="lg" 
                        sx={{ 
                            py: 3,
                            ...(isDialog && {
                                height: 'auto',
                                minHeight: 'calc(100vh - 120px)', // Account for header space
                                overflow: 'visible'
                            })
                        }}
                    >
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <Card elevation={2}>
                                    <CardHeader 
                                        avatar={<SettingsIcon color="primary" />}
                                        title="Cài đặt hệ thống"
                                        subheader="Cấu hình và tùy chỉnh K-Tool"
                                    />
                                    <Divider />
                                    <CardContent>
                                        <Stack spacing={3}>
                                            <FormControlLabel
                                                control={
                                                    <Switch 
                                                        checked={isDarkMode}
                                                        onChange={toggleTheme}
                                                        color="primary"
                                                    />
                                                }
                                                label={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        {isDarkMode ? <DarkModeIcon /> : <LightModeIcon />}
                                                        Chế độ tối
                                                    </Box>
                                                }
                                            />
                                            
                                            <Divider />
                                            
                                            <Typography variant="h6" color="primary">
                                                Thông tin ứng dụng
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                K-Tool Document Assistant v2.0
                                                <br />
                                                Hỗ trợ AI-powered document generation và analysis
                                            </Typography>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    </Container>
                );
            
            case 'main':
            default:
                return (
                    <Box sx={{ 
                        height: '100%', 
                        display: 'flex', 
                        flexDirection: 'column',
                        ...(isDialog && {
                            height: 'auto',
                            minHeight: 'calc(100vh - 120px)',
                        })
                    }}>
                        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                            <Tabs 
                                value={currentMainTab} 
                                onChange={(_, newValue) => setCurrentMainTab(newValue)}
                                variant={isMobile ? 'scrollable' : 'standard'}
                                scrollButtons="auto"
                                sx={{
                                    '& .MuiTab-root': {
                                        textTransform: 'none',
                                        fontWeight: 500,
                                        fontSize: '14px',
                                        minHeight: 48,
                                    }
                                }}
                            >
                                <Tab icon={<HomeIcon />} label="Trang chủ" />
                                {/* <Tab icon={<DocumentIcon />} label="Tài liệu" />
                                <Tab icon={<CodeIcon />} label="Code Gen" />
                                <Tab icon={<PreviewIcon />} label="Preview" /> */}
                            </Tabs>
                        </Box>
                        
                        <Box sx={{ 
                            flex: 1, 
                            overflow: isDialog ? 'auto' : 'hidden',
                            ...(isDialog && {
                                '&::-webkit-scrollbar': {
                                    width: '8px',
                                },
                                '&::-webkit-scrollbar-track': {
                                    background: isDarkMode ? '#2a2a2a' : '#f1f1f1',
                                    borderRadius: '4px',
                                },
                                '&::-webkit-scrollbar-thumb': {
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    borderRadius: '4px',
                                },
                                '&::-webkit-scrollbar-thumb:hover': {
                                    background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                                },
                            })
                        }}>
                            <TabNavigation 
                                state={state}
                                updateState={updateState}
                                isFullscreen={isFullscreen}
                                isDarkMode={isDarkMode}
                                isDialog={isDialog}
                            />
                        </Box>
                    </Box>
                );
        }
    };

    if (!isOpen && !isDialog) return null;

    const content = (
        <ThemeProvider theme={muiTheme}>
            <CssBaseline />
            <Box sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                background: isDialog ? 'transparent' : 'background.default'
            }}>
                {/* Header - Only show for standalone popup, not dialog */}
                {!isDialog && (
                    <AppBar 
                        position="static" 
                        elevation={0}
                        sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                    >
                        <Toolbar sx={{ justifyContent: 'space-between', px: 3 }}>
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
                                        color: 'white',
                                    }}
                                >
                                    K
                                </Box>
                                <Box>
                                    <Typography variant="h6" component="div" sx={{ fontWeight: 600, color: 'white' }}>
                                        {getViewTitle()}
                                    </Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.9, color: 'white' }}>
                                        K-Tool Document Assistant
                                    </Typography>
                                </Box>
                            </Box>
                            
                            <Stack direction="row" spacing={1}>
                                {state.currentView === 'settings' && (
                                    <Tooltip title="Quay lại">
                                        <IconButton 
                                            onClick={() => updateState({ currentView: 'main' })}
                                            sx={{ color: 'white' }}
                                        >
                                            <ArrowBackIcon />
                                        </IconButton>
                                    </Tooltip>
                                )}
                                
                                <Tooltip title={isDarkMode ? 'Chế độ sáng' : 'Chế độ tối'}>
                                    <IconButton onClick={toggleTheme} sx={{ color: 'white' }}>
                                        {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
                                    </IconButton>
                                </Tooltip>
                                
                                <Tooltip title="Cài đặt">
                                    <IconButton 
                                        onClick={() => updateState({ 
                                            currentView: state.currentView === 'settings' ? 'main' : 'settings' 
                                        })}
                                        sx={{ 
                                            color: 'white',
                                            background: state.currentView === 'settings' ? 'rgba(255, 255, 255, 0.2)' : 'transparent'
                                        }}
                                    >
                                        <SettingsIcon />
                                    </IconButton>
                                </Tooltip>
                                
                                <Tooltip title={isFullscreen ? 'Thoát toàn màn hình (ESC)' : 'Toàn màn hình (F11)'}>
                                    <IconButton onClick={toggleFullscreen} sx={{ color: 'white' }}>
                                        {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                                    </IconButton>
                                </Tooltip>
                                
                                <Tooltip title="Đóng">
                                    <IconButton onClick={handleClose} sx={{ color: 'white' }}>
                                        <ArrowBackIcon />
                                    </IconButton>
                                </Tooltip>
                            </Stack>

                        </Toolbar>
                    </AppBar>
                )}

                {/* Content */}
                <Box sx={{ 
                    flex: 1, 
                    overflow: isDialog ? 'auto' : 'hidden', 
                    display: 'flex', 
                    flexDirection: 'column',
                    '&::-webkit-scrollbar': {
                        width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                        background: isDarkMode ? '#2a2a2a' : '#f1f1f1',
                        borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                        background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                    },
                }}>
                    <Fade in={true} timeout={300}>
                        <Box sx={{ 
                            flex: 1, 
                            overflow: isDialog ? 'visible' : 'hidden',
                            minHeight: isDialog ? 'auto' : 'inherit'
                        }}>
                            {renderCurrentView()}
                        </Box>
                    </Fade>
                </Box>
            </Box>
        </ThemeProvider>
    );

    // If used as dialog, return content only
    if (isDialog) {
        return content;
    }

    // Standalone popup
    return (
        <Paper
            elevation={24}
            sx={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: isFullscreen ? '100vw' : isMobile ? '95vw' : '90vw',
                height: isFullscreen ? '100vh' : isMobile ? '90vh' : '85vh',
                maxWidth: isFullscreen ? 'none' : '1400px',
                maxHeight: isFullscreen ? 'none' : '900px',
                borderRadius: isFullscreen ? 0 : 3,
                overflow: 'hidden',
                zIndex: 10000,
                boxShadow: isFullscreen ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
        >
            {content}
        </Paper>
    );
};

export default KToolPopup;