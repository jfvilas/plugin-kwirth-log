/*
Copyright 2025 Julio Fernandez

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import React, { useState } from 'react'
import CardHeader from '@material-ui/core/CardHeader'
import Checkbox from '@material-ui/core/Checkbox'
import Divider from '@material-ui/core/Divider'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Grid from '@material-ui/core/Grid'
import { Typography } from '@material-ui/core'
import { IOptions } from './IOptions'

interface IProps {
    options: IOptions,
    disabled: boolean,
    onChange: (options:IOptions) => void
}

const Options = (props: IProps) => {
    const [options, setOptions] = useState<IOptions>(props.options);

    const handleChange = (change:any) => {
        var a = {...options,...change}
        setOptions(a)
        props.onChange(a)
    }

    return (<>
        <CardHeader title={'Options'}/>
        <Divider style={{marginTop:8}}/>
        <Grid container direction='column' spacing={0}>
            <Grid item >
                <FormControlLabel style={{marginLeft:8}} label="From start" control={<Checkbox checked={options.fromStart} onChange={() => handleChange({fromStart:!options.fromStart})} disabled={props.disabled}/>} />
            </Grid>
            <Grid item >
                <FormControlLabel style={{marginLeft:8}} label="Show timestamp" control={<Checkbox checked={options.showTimestamp} onChange={() => handleChange({showTimestamp:!options.showTimestamp})} disabled={props.disabled}/>} />
            </Grid>
            <Grid item >
                <FormControlLabel style={{marginLeft:8}} label="Show names" control={<Checkbox checked={options.showPodNames} onChange={() => handleChange({showNames:!options.showPodNames})} disabled={props.disabled}/>} />
            </Grid>
            <Grid item >
                <FormControlLabel style={{marginLeft:8}}  label="Follow log" control={<Checkbox checked={options.followLog} onChange={() => handleChange({followLog:!options.followLog})} />} disabled={props.disabled}/>
            </Grid>
            <Grid item >
                <FormControlLabel style={{marginLeft:8}}  label="Wrap lines" control={<Checkbox checked={options.wrapLines} onChange={() => handleChange({wrapLines:!options.wrapLines})} />} disabled={props.disabled}/>
            </Grid>
            <Grid item >
                <Typography style={{fontSize:9, marginLeft:20, marginTop:4, marginBottom:6}}>Powered by <a href='https://jfvilas.github.io/kwirth/' target='_blank' style={{color:'blue'}}>Kwirth</a></Typography>
            </Grid>
        </Grid>
    </>)
}

export { Options }