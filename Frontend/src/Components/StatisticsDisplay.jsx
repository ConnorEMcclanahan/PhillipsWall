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
                console.log(data)
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
            <Box className={styles.loadingContainer}>
                <CircularProgress className={styles.loadingSpinner}/>
            </Box>
        );
    }

    if (error) {
        return (
            <Container className={styles.errorContainer}>
                <Alert severity="error" className={styles.errorAlert}>
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
    
    const questionColorPairs = stats.color_usage.questions.map((q, i) => ({
        question: q.en, 
        color: stats.color_usage.colors[i]
    }));

    const GeneralMetrics = () => (
        <Fade in={true} timeout={800}>
            <Grid container spacing={3} className={styles.generalMetricsContainer}>
                {/* Total Questions Blok */}
                <Grid item xs={12} md={4}>
                    <Box className={`${styles.glassCard} ${styles.generalMetricsCard}`}>
                        <Box className={styles.metricCard}>
                            <Typography variant="h6" className={styles.metricTitle}>{translate('totalQuestions')}</Typography>
                            <PeopleIcon className={styles.metricIcon}/>
                        </Box>
                        <Typography variant="h3" className={styles.metricValue}>
                            {stats.general_metrics.total_questions}
                        </Typography>
                    </Box>
                </Grid>
                
                {/* Total Answers Blok */}
                <Grid item xs={12} md={4}>
                    <Box className={`${styles.glassCard} ${styles.generalMetricsCard}`}>
                        <Box className={styles.metricCard}>
                            <Typography variant="h6" className={styles.metricTitle}>{translate('totalAnswers')}</Typography>
                            <MessageIcon className={styles.metricIcon}/>
                        </Box>
                        <Typography variant="h3" className={styles.metricValue}>
                            {stats.general_metrics.total_answers}
                        </Typography>
                    </Box>
                </Grid>
                
                {/* Average Answers Per Question Blok */}
                <Grid item xs={12} md={4}>
                    <Box className={`${styles.glassCard} ${styles.generalMetricsCard}`}>
                        <Box className={styles.metricCard}>
                            <Typography variant="h6" className={styles.metricTitle}>{translate('avgAnswersPerQuestion')}</Typography>
                            <PieChartIcon className={styles.metricIcon}/>
                        </Box>
                        <Typography variant="h3" className={styles.metricValue}>
                            {stats.general_metrics.average_answers_per_question}
                        </Typography>
                    </Box>
                </Grid>
            </Grid>
        </Fade>
    );

    const Distribution = () => (
        <Fade in={true} timeout={800}>
            <Grid container spacing={5} className={styles.distributionContainer}>
                {/* Language Distribution Blok */}
                <Grid item xs={12} md={6}>
                    <Box className={`${styles.glassCard} ${styles.languageDistributionCard}`}>
                        <Typography variant="h6" className={styles.chartTitle}>{translate('languageDistribution')}</Typography>
                        <ResponsiveContainer className={styles.chartContainer}>
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
                    </Box>
                </Grid>
                
                {/* Response Distribution Blok */}
                <Grid item xs={12} md={6}>
                    <Box className={`${styles.glassCard} ${styles.responseDistributionCard}`}>
                        <Typography variant="h6" className={styles.chartTitle}>{translate('responseDistribution')}</Typography>
                        <ResponsiveContainer className={styles.chartContainer}>
                            <BarChart data={responseDistData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)"/>
                                <XAxis dataKey="name" stroke="black"/>
                                <YAxis stroke="black"/>
                                <Tooltip contentStyle={{background: 'rgba(255,255,255,0.8)'}}/>
                                <Legend/>
                                <Bar dataKey="value" fill="#64b5f6"/>
                            </BarChart>
                        </ResponsiveContainer>
                    </Box>
                </Grid>
            </Grid>
        </Fade>
    );

    const Engagement = () => (
        <Fade in={true} timeout={800}>
            <Grid container spacing={3} className={styles.engagementContainer}>
                {/* Post-it Wall Engagement Blok */}
                <Grid item xs={12} md={6}>
                    <Box className={`${styles.glassCard} ${styles.engagementMetricsCard}`}>
                        <Typography variant="h6" className={styles.chartTitle}>{translate('Post-it Wall Engagement')}</Typography>
                        <List>
                            {stats.engagement_metrics.map(({ answer_count, month, year }) => (
                                <React.Fragment key={`${year}-${month}`}>
                                    <ListItem>
                                    <ListItemText
                                        primary={
                                        <Typography className={styles.engagementList}>
                                            Scanned post-its: {answer_count}
                                        </Typography>
                                        }
                                        secondary={
                                        <Typography className={styles.engagementSecondary}>
                                            {month}/{year}
                                        </Typography>
                                        }
                                    />
                                    </ListItem>
                                </React.Fragment>
                            ))}
                        </List>
                    </Box>
                </Grid>
                
                {/* Color Usage Blok */}
                <Grid item xs={12} md={6}>
                    <Box className={`${styles.glassCard} ${styles.colorUsageCard}`}>
                        <Box className={styles.colorUsageHeader}>
                            <Typography variant="h6" className={styles.metricTitle}>{translate('colorUsage')}</Typography>
                            <PaletteIcon className={styles.colorUsageIcon}/>
                        </Box>
                        <Grid container spacing={2}>
                            {questionColorPairs.map(({question, color}) => (
                                <Grid item xs={12} key={question}>
                                    <Box className={styles.colorItem}>
                                        <Box className={styles.colorSwatch} style={{backgroundColor: color}}/>
                                        <Typography className={styles.colorQuestion}>{question}</Typography>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                </Grid>
            </Grid>
        </Fade>
    );

    return (
        <Container className={styles.container}>
            <Typography variant="h4" className={styles.statTitle}>
                {translate('postWallStatistics')}
            </Typography>

            <GeneralMetrics />
            <Box className={styles.gridSpacing} />
            <Distribution />
            <Box className={styles.gridSpacing} />
            <Engagement />
        </Container>
    );
};

export default StatisticsDashboard;