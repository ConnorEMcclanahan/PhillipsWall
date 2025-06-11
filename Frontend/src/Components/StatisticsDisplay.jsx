import React, {useState, useEffect} from 'react';
import {
    Box,
    Container,
    Grid,
    Typography,
    CircularProgress,
    Alert,
    List,
    ListItem,
    ListItemText,
    Divider,
    Fade
} from '@mui/material';
import {styled} from '@mui/material/styles';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer
} from 'recharts';
import PeopleIcon from '@mui/icons-material/People';
import MessageIcon from '@mui/icons-material/Message';
import PieChartIcon from '@mui/icons-material/PieChart';
import PaletteIcon from '@mui/icons-material/Palette';
import styles from './StatisticsDisplay.module.css';
import translations from '../Pages/translations.json';
import {useLanguage} from "./LanguageContext";

// Styled components to match the application theme
const GlassCard = styled(Box)(({theme}) => ({
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '16px',
    padding: theme.spacing(3),
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
}));



const StatisticsDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const COLORS = ['#64b5f6', '#2196f3', '#1976d2', '#0d47a1', '#82b1ff'];
    const translate = (key) => translations[language]?.[key] || key;
    const { language } = useLanguage();

    useEffect(() => {
        fetch('http://localhost:5000/statistics')
            .then(res => res.json())
            .then(data => {
                setStats(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                    <CircularProgress sx={{color: 'white'}}/>
                </Box>
        );
    }

    if (error) {
        return (
                <Container maxWidth="lg">
                    <Alert severity="error" sx={{background: 'rgba(255,255,255,0.1)', color: 'white'}}>
                        Failed to load statistics: {error}
                    </Alert>
                </Container>
        );
    }

    // Transform data for charts
    const languageData = Object.entries(stats.language_distribution.percentage_per_language)
        .map(([name, value]) => ({name, value}));

    const responseDistData = Object.entries(stats.response_distribution.questions_by_answer_count)
        .map(([questionID, value]) => ({name: `Question ${questionID}`, value}));

    const colorData = Object.entries(stats.color_usage.most_used_colors)
        .map(([name, value]) => ({name, value}));

    const GeneralMetrics = () => (
        <Fade in={true} timeout={800}>
            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <GlassCard>
                        <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2}}>
                            <Typography variant="h6" sx={{color: 'black'}}>{translate('totalQuestions')}</Typography>
                            <PeopleIcon sx={{color: 'rgba(0,0,0,0.7)'}}/>
                        </Box>
                        <Typography variant="h3" sx={{color: 'black'}}>
                            {stats.general_metrics.total_questions}
                        </Typography>
                    </GlassCard>
                </Grid>
                <Grid item xs={12} md={4}>
                    <GlassCard>
                        <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2}}>
                            <Typography variant="h6" sx={{color: 'black'}}>{translate('totalAnswers')}</Typography>
                            <MessageIcon sx={{color: 'rgba(0,0,0,0.7)'}}/>
                        </Box>
                        <Typography variant="h3" sx={{color: 'black'}}>
                            {stats.general_metrics.total_answers}
                        </Typography>
                    </GlassCard>
                </Grid>
                <Grid item xs={12} md={4}>
                    <GlassCard>
                        <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2}}>
                            <Typography variant="h6" sx={{color: 'black'}}>{translate('avgAnswersPerQuestion')}</Typography>
                            <PieChartIcon sx={{color: 'rgba(0,0,0,0.7)'}}/>
                        </Box>
                        <Typography variant="h3" sx={{color: 'black'}}>
                            {stats.general_metrics.average_answers_per_question}
                        </Typography>
                    </GlassCard>
                </Grid>
            </Grid>
        </Fade>
    );

    const Distribution = () => (
        <Fade in={true} timeout={800}>
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <GlassCard sx={{height: '400px'}}>
                        <Typography variant="h6" gutterBottom sx={{color: 'black'}}>{translate('languageDistribution')}</Typography>
                        <ResponsiveContainer width="100%" height="90%">
                            <PieChart>
                                <Pie
                                    data={languageData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                    outerRadius={120}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {languageData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]}/>
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{background: 'rgba(255,255,255,0.8)'}}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </GlassCard>
                </Grid>
                <Grid item xs={12} md={6}>
                    <GlassCard sx={{height: '400px'}}>
                        <Typography variant="h6" gutterBottom sx={{color: 'black'}}>{translate('responseDistribution')}</Typography>
                        <ResponsiveContainer width="100%" height="90%">
                            <BarChart data={responseDistData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)"/>
                                <XAxis dataKey="name" stroke="black"/>
                                <YAxis stroke="black"/>
                                <Tooltip contentStyle={{background: 'rgba(255,255,255,0.8)'}}/>
                                <Legend/>
                                <Bar dataKey="value" fill="#64b5f6"/>
                            </BarChart>
                        </ResponsiveContainer>
                    </GlassCard>
                </Grid>
            </Grid>
        </Fade>
    );

    const Engagement = () => (
        <Fade in={true} timeout={800}>
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <GlassCard>
                        <Typography variant="h6" gutterBottom sx={{color: 'black'}}>{translate('mostEngagingQuestions')}</Typography>
                        <List>
                            {stats.engagement_metrics.most_engaging_questions.map((question, index) => (
                                <React.Fragment key={question.question_id}>
                                    <ListItem>
                                        <ListItemText
                                            primary={
                                                <Typography sx={{color: 'black'}}>
                                                    {question[`question_text_${language}`]}
                                                </Typography>
                                            }
                                            secondary={
                                                <Typography sx={{color: 'rgba(0,0,0,0.7)'}}>
                                                    {question.answer_count} answers
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                    {index < stats.engagement_metrics.most_engaging_questions.length - 1 &&
                                        <Divider sx={{borderColor: 'rgba(0,0,0,0.1)'}}/>
                                    }
                                </React.Fragment>
                            ))}
                        </List>
                    </GlassCard>
                </Grid>
                <Grid item xs={12} md={6}>
                    <GlassCard>
                        <Box sx={{display: 'flex', alignItems: 'center', mb: 2}}>
                            <Typography variant="h6" sx={{color: 'black'}}>{translate('colorUsage')}</Typography>
                            <PaletteIcon sx={{ml: 1, color: 'rgba(0,0,0,0.7)'}}/>
                        </Box>
                        <Grid container spacing={2}>
                            {colorData.map(({name, value}) => (
                                <Grid item xs={12} key={name}>
                                    <Box sx={{display: 'flex', alignItems: 'center', gap: 2}}>
                                        <Box sx={{width: 20, height: 20, borderRadius: 1, bgcolor: name}}/>
                                        <Typography sx={{flexGrow: 1, color: 'black'}}>{name}</Typography>
                                        <Typography sx={{fontWeight: 'bold', color: 'black'}}>{value}</Typography>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </GlassCard>
                </Grid>
            </Grid>
        </Fade>
    );

    return (
        <Container className={styles.container} sx={{ maxWidth: '1400px', width: '100%' }}>
            <Typography variant="h4" gutterBottom sx={{mb: 4, color: 'black'}} className={styles.statTitle}>
                {translate('postWallStatistics')}
            </Typography>

            <GeneralMetrics />
            <Box sx={{ mt: 4 }} />
            <Distribution />
            <Box sx={{ mt: 4 }} />
            <Engagement />
        </Container>
    );
};

export default StatisticsDashboard;