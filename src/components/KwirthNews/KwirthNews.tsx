import React from 'react'
import CardHeader from '@material-ui/core/CardHeader'
import Divider from '@material-ui/core/Divider'
import Grid from '@material-ui/core/Grid'
import { Typography } from '@material-ui/core'
import { IBackendInfo } from '@jfvilas/plugin-kwirth-common'
import { versionGreaterThan } from '@jfvilas/kwirth-common'
import { VERSION } from '../..'

interface IProps {
    backendVersion: string
    latestVersions: IBackendInfo
}

const KwirthNews = (props: IProps) => {

    let news:string[] = []
    try {
        if (versionGreaterThan(props.latestVersions['plugin-kwirth-backend'], props.backendVersion)) news.push(`New version of 'plugin-kwirth-backend': your have ${props.backendVersion} and latest is ${props.latestVersions['plugin-kwirth-backend']}`)
        if (versionGreaterThan(props.latestVersions['plugin-kwirth-log'], VERSION)) news.push(`New version of 'plugin-kwirth-log': your have ${VERSION} and latest is ${props.latestVersions['plugin-kwirth-log']}`)
    }
    catch {
    }

    if (news.length===0) return <></>
    
    return (<>
        <CardHeader title={'Kwirth news'}/>
        <Divider style={{marginTop:8}}/>
        <Grid container direction='column' spacing={0}>
            <Grid item style={{padding:4}}>
                {
                    news.map(n => {
                        return <Typography style={{fontSize:11, marginBottom:6}}>{n}</Typography>
                    })
                }

                <Typography style={{fontSize:9, marginLeft:20, marginTop:4, marginBottom:6}}>Powered by <a href='https://jfvilas.github.io/kwirth/' target='_blank' style={{color:'blue'}}>Kwirth</a></Typography>
            </Grid>
        </Grid>
    </>)
}

export { KwirthNews }