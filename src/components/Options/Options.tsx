import React, { useState } from 'react'
import CardHeader from '@material-ui/core/CardHeader'
import Checkbox from '@material-ui/core/Checkbox'
import Divider from '@material-ui/core/Divider'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Grid from '@material-ui/core/Grid'
import { Typography } from '@material-ui/core'

interface IProps {
    options: any,
    disabled: boolean,
    onChange: (options:{}) => void
}

const Options = (props: IProps) => {
    const [options, setOptions] = useState<any>(props.options);

    const handleChange = (change:any) => {
        var a = {...options,...change}
        setOptions(a);
        props.onChange(a);
    }

    return (<>
        <CardHeader title={'Options'}/>
        <Divider style={{marginTop:8}}/>
        <Grid container direction='column' spacing={0}>
            <Grid item >
                <FormControlLabel style={{marginLeft:8}} label="From start" control={<Checkbox checked={options.fromStart} onChange={() => handleChange({fromStart:!options.fromStart})} disabled={props.disabled}/>} />
            </Grid>
            <Grid item >
                <FormControlLabel style={{marginLeft:8}} label="Add timestamp" control={<Checkbox checked={options.timestamp} onChange={() => handleChange({timestamp:!options.timestamp})} disabled={props.disabled}/>} />
            </Grid>
            <Grid item >
                <FormControlLabel style={{marginLeft:8}} control={<Checkbox checked={options.follow} onChange={() => handleChange({follow:!options.follow})} />} label="Follow log" disabled={props.disabled}/>
            </Grid>
            <Grid item >
                <Typography style={{fontSize:9, marginLeft:20, marginTop:4, marginBottom:6}}>Powered by <a href='https://jfvilas.github.io/kwirth/' target='_blank' style={{color:'blue'}}>Kwirth</a></Typography>
            </Grid>
        </Grid>
    </>)
}

export { Options }