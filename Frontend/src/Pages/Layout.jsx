import React, {useState} from "react";
import styles from './Layout.module.css';
import {Box, IconButton, FormControl, Select, InputLabel, MenuItem, ListItemText, ListItemIcon} from '@mui/material';
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import HomeIcon from '@mui/icons-material/Home';
import BarChartIcon from '@mui/icons-material/BarChart';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import Flag from 'react-world-flags';
import translations from './translations.json';
import {useLanguage} from '../Components/LanguageContext';  // Import useLanguage hook
import logo from "../images/MuseumLogo.png"

import {ReactComponent as PostWallLogo} from '../images/PostWall-logo.svg';
import {Link} from "react-router-dom";

const Layout = ({children}) => {
    const {language, handleLanguageChange} = useLanguage();

    const translate = (key) => translations[language]?.[key] || key;

    const LanguageSwitcher = () => (
        <FormControl
            className={styles.languageSelector}
            variant="standard"
            sx={{
                minWidth: 70,
                background: "var(--offWhite)",
                borderRadius: "5px",
                boxShadow: "2px 2px 5px var(--midWhite)",
                '& .MuiSelect-root': {
                    padding: "0.5rem",
                },
                '& .MuiSvgIcon-root': {
                    color: "var(--darkBlack)",
                },
            }}
        >
            <Select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                displayEmpty
                renderValue={(selected) => (
                    <Box display="flex" alignItems="center" justifyContent="center">
                        <Flag code={selected === 'en' ? 'US' : 'NL'} width={60}/>
                    </Box>
                )}
                inputProps={{
                    'aria-label': 'Language Selector',
                }}
            >
                <MenuItem value="en">
                    <ListItemIcon>
                        <Flag code="US" width={20}/>
                    </ListItemIcon>
                    <ListItemText primary="English"/>
                </MenuItem>
                <MenuItem value="nl">
                    <ListItemIcon>
                        <Flag code="NL" width={20}/>
                    </ListItemIcon>
                    <ListItemText primary="Dutch"/>
                </MenuItem>
            </Select>
        </FormControl>
    );

    return (
        <Box className={styles.layout}>
            <Box className={styles.content}>
                <Box className={styles.topBar}>
                    <Box className={styles.logoItem}>
                        <a href="/" component={Link}>
                            <PostWallLogo width="250" height="50"/>
                        </a>
                    </Box>
                    <Box className={styles.contentNav}>
                        <Box component="a" href="/statistics" className={styles.navAreas}>
                            <BarChartIcon/>
                            <ListItemText primary={translate("statistics")}/>
                        </Box>
                        <Box component="a" href="/imageScan" className={styles.navAreas}>
                            <CenterFocusStrongIcon/>
                            <ListItemText primary={translate("iconScan")}/>
                        </Box>
                        <Box>
                            <LanguageSwitcher/>
                        </Box>
                    </Box>
                    <Box className={styles.logoItem}>
                        <img
                            src={logo} // Adjust the path based on your folder structure
                            alt="App Icon"
                            className={styles.appIcon}
                            style={{height: 55, marginRight: 16}}
                        />
                    </Box>
                </Box>
                <Box className={styles.main}>
                    <main>{children}</main>
                </Box>
            </Box>
        </Box>
    );
};

export default Layout;
