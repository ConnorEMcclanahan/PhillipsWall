// Ahsen was hier
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
    ResponsiveContainer,
    LineChart,
    Line,
} from 'recharts';
import PeopleIcon from '@mui/icons-material/People';
import MessageIcon from '@mui/icons-material/Message';
import PieChartIcon from '@mui/icons-material/PieChart';
import PaletteIcon from '@mui/icons-material/Palette';
import LanguageIcon from '@mui/icons-material/Translate';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import NotListedLocationIcon from '@mui/icons-material/NotListedLocation';
import styles from './StatisticsDisplay.module.css';
import translations from '../Pages/translations.json';
import {useLanguage} from "./LanguageContext";
import { Text } from 'recharts';

const breakByWidth = (label, maxCharsPerLine = 16) => {
    const words = label.split(' ');
    const lines = [];
    let currentLine = '';
    words.forEach(word => {
      if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    if (currentLine) lines.push(currentLine);
    return lines;
  };
  
  const WordBreakTick = ({ x, y, payload }) => {
    const label = typeof payload.value === 'string'
      ? payload.value
      : payload.payload?.name || '';
    const lines = breakByWidth(label, 16); // Adjust maxCharsPerLine as needed
    return (
      <g transform={`translate(${x},${y + 20})`}>
        {lines.map((line, i) => (
          <text key={i} x={0} y={i * 14} textAnchor="middle" fill="#000" fontSize="12">
            {line}
          </text>
        ))}
      </g>
    );
  };
   
  
  
 
const StatisticsDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
 
    const COLORS = ['#64b5f6', '#2196f3', '#1976d2', '#0d47a1', '#82b1ff'];
    const { language } = useLanguage();
    const translate = (key) => translations[language]?.[key] || key;
 
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
 
    // Maak een mapping van question_id naar vraagtekst (in de juiste taal)
    const questionIdToText = Object.fromEntries(
        stats.color_usage.questions.map(q => [String(q.question_id), q[language] || q.en || q.nl])
    );

    // Mapping van question_id naar kleur
    const questionIdToColor = Object.fromEntries(
        stats.color_usage.questions.map((q, i) => [String(q.question_id), stats.color_usage.colors[i]])
    );

    // Gebruik de echte vraagtekst als naam in de responseDistData en voeg id toe
    const responseDistData = Object.entries(stats.response_distribution.questions_by_answer_count)
        .map(([questionID, value]) => ({
            id: questionID,
            name: questionIdToText[questionID] || `Question ${questionID}`,
            value
        }));
 
    const questionColorPairs = stats.color_usage.questions.map((q, i) => ({
        question: q.en,
        color: stats.color_usage.colors[i]
    }));
 
     const lineData = stats.engagement_metrics.map(({ month, year, answer_count }) => ({
        name: `${month}/${year}`,
        answers: answer_count,
    }));
 
    // Custom tick component voor de X-as labels
    const BarLabelTick = (props) => {
        const { x, y, payload } = props;
        return (
            <text
                x={x}
                y={y + 16}
                textAnchor="middle"
                className={styles.barLabel}
            >
                {payload.value}
            </text>
        );
    };

    // Custom tick component voor de X-as labels
    const ResponseBarLabelTick = (props) => {
        const { x, y, payload } = props;
        const width = 80; // breedte van het label in px, pas aan indien gewenst
        return (
            <foreignObject x={x - width / 2} y={y + 6} width={width} height={48} style={{ overflow: 'visible' }}>
                <div
                    className={styles.responseBarLabel}
                    style={{
                        width: width,
                        textAlign: 'center',
                        wordBreak: 'break-word',
                        whiteSpace: 'normal',
                        fontSize: '0.85rem',
                        lineHeight: '1.1',
                        pointerEvents: 'none',
                        margin: 0,
                        padding: 0
                    }}
                >
                    {payload.value}
                </div>
            </foreignObject>
        );
    };
 
    const Distribution = () => (
        <Fade in={true} timeout={800}>
            <div className={styles.metricsFlexContainer}>
                {/* Language Distribution Blok (2/5 breedte) */}
                <div className={styles.languageDistributionColumn}>
                    <Box className={`${styles.glassCard} ${styles.languageDistributionCard}`}>
                        <Typography variant="h6" className={styles.chartTitle}>
                            {translate('languageDistribution')}
                            <LanguageIcon className={styles.metricIcon}/>
                        </Typography>
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
                                    dataKey="value">
                                    {languageData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]}/>
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{background: 'rgba(255,255,255,0.8)'}}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </Box>
                </div>
 
                {/* Timeline Blok (3/5 breedte) */}
                <div className={styles.timelineColumn}>
                    <Box className={`${styles.glassCard} ${styles.timelineCard}`}>
                        <Typography variant="h6" className={styles.chartTitle}>
                            {translate('answersOverTime')}
                            <QueryStatsIcon className={styles.metricIcon}/>
                        </Typography>
                        <ResponsiveContainer width="99%" height={320}>
                            <LineChart data={lineData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" stroke="black" tick={<BarLabelTick />} />
                                <YAxis stroke="black" />
                                <Tooltip contentStyle={{background: 'rgba(255,255,255,0.8)'}}/>
                                <Line type="monotone" dataKey="answers" stroke="#2196f3" strokeWidth={3} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Box>
                </div>
            </div>
        </Fade>
    );
 
    const ResponseDistribution = () => (
        <Fade in={true} timeout={800}>
            <div className={styles.metricsFlexContainer}>
                <div className={styles.responseDistributionColumn}>
                    <Box className={`${styles.glassCard} ${styles.responseDistributionCard}`}>
                        <Typography variant="h6" className={styles.chartTitle}>
                            {translate('responseDistribution')}
                            <NotListedLocationIcon className={styles.metricIcon}/>
                        </Typography>
                        <ResponsiveContainer className={styles.chartContainer}>
                        <BarChart data={responseDistData} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" vertical={false}/>
                                <XAxis dataKey="name" stroke="black" interval={0} textAnchor="end"  tick={<WordBreakTick />}/>
                                <YAxis stroke="black"/>
                                <Tooltip contentStyle={{background: 'rgba(255,255,255,0.8)'}}/>
                                <Bar dataKey="value" barSize={80}>
                                    {responseDistData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={questionIdToColor[entry.id] || "#64b5f6"} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </Box>
                </div>
            </div>
        </Fade>
    );
 
     const MetricsFlexContainer = () => (
        <div className={styles.metricsFlexContainer}>
            <div className={styles.metricsColumn}>
                <Box className={`${styles.glassCard} ${styles.generalMetricsCard}`}>
                    <Box className={styles.metricCard}>
                        <Typography variant="h6" className={styles.metricTitle}>
                            {translate('totalQuestions')}
                            <PeopleIcon className={styles.metricIcon}/>
                        </Typography>
                    </Box>
                    <Typography variant="h3" className={styles.metricValue}>
                        {stats.general_metrics.total_questions}
                    </Typography>
                </Box>
                <Box className={`${styles.glassCard} ${styles.generalMetricsCard}`}>
                    <Box className={styles.metricCard}>
                        <Typography variant="h6" className={styles.metricTitle}>
                            {translate('totalAnswers')}
                            <MessageIcon className={styles.metricIcon}/>
                        </Typography>
                    </Box>
                    <Typography variant="h3" className={styles.metricValue}>
                        {stats.general_metrics.total_answers}
                    </Typography>
                </Box>
                <Box className={`${styles.glassCard} ${styles.generalMetricsCard}`}>
                    <Box className={styles.metricCard}>
                        <Typography variant="h6" className={styles.metricTitle}>
                            {translate('avgAnswersPerQuestion')}
                            <PieChartIcon className={styles.metricIcon}/>
                        </Typography>
                    </Box>
                    <Typography variant="h3" className={styles.metricValue}>
                        {stats.general_metrics.average_answers_per_question}
                    </Typography>
                </Box>
            </div>
            <div className={styles.colorUsageColumn}>
                <Box className={`${styles.glassCard} ${styles.colorUsageCard}`}>
                    <Typography variant="h6" className={styles.metricTitle}>
                        {translate('colorUsage')}
                        <PaletteIcon className={styles.colorUsageIcon}/>
                    </Typography>
                    <div className={styles.colorUsageColumns}>
                        <div className={styles.colorUsageColumnCustom}>
                            {questionColorPairs.slice(0, Math.ceil(questionColorPairs.length / 2)).map(({question, color}) => (
                                <Box className={styles.colorItem} key={question}>
                                    <Box className={styles.colorSwatch} style={{backgroundColor: color}}/>
                                    <Typography className={styles.colorQuestion}>{question}</Typography>
                                </Box>
                            ))}
                        </div>
                        <div className={styles.colorUsageColumnCustom}>
                            {questionColorPairs.slice(Math.ceil(questionColorPairs.length / 2)).map(({question, color}) => (
                                <Box className={styles.colorItem} key={question}>
                                    <Box className={styles.colorSwatch} style={{backgroundColor: color}}/>
                                    <Typography className={styles.colorQuestion}>{question}</Typography>
                                </Box>
                            ))}
                        </div>
                    </div>
                </Box>
            </div>
        </div>
    );
   
 
 
    return (
        <Container className={styles.container}>
            <Typography variant="h4" className={styles.statTitle}>
                {translate('postWallStatistics')}
            </Typography>
 
            <MetricsFlexContainer />
            <Box className={styles.gridSpacing} />
            <Distribution />
            <Box className={styles.gridSpacing} />
            <ResponseDistribution />
        </Container>
    );
};
 
export default StatisticsDashboard;