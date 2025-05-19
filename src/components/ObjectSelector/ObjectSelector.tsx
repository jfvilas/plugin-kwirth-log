import React, { useState } from 'react'
import { ClusterValidPods } from '@jfvilas/plugin-kwirth-common'
import FormControl from '@material-ui/core/FormControl'
import Select from '@material-ui/core/Select'
import MenuItem from '@material-ui/core/MenuItem'
import { Checkbox, Chip, Grid, ListItemText } from '@material-ui/core'
import { InstanceConfigScopeEnum, parseResources } from '@jfvilas/kwirth-common'

interface IProps {
    onSelect: (namespaces:string[], podNames:string[], containerNames:string[]) => void,
    cluster: ClusterValidPods,
    selectedNamespaces: string[],
    selectedPodNames: string[],
    selectedContainerNames: string[],
    disabled: boolean
}

const ObjectSelector = (props: IProps) => {
    const [render, setRender] = useState(false)
    let pods = props.cluster.data
    let namespaceList = Array.from(new Set(pods.map(p => p.namespace)))

    const onNamespaceChange = (namespace:string) => {
        let i = props.selectedNamespaces.indexOf(namespace)
        if (i>=0)
            props.selectedNamespaces.splice(i,1)
        else
            props.selectedNamespaces.push(namespace)

        props.selectedPodNames.splice(0,props.selectedPodNames.length)
        let pods = getPodList()
        if (pods.length===1) props.selectedPodNames.push( ...pods.map(p => p.name) )

        props.selectedContainerNames.splice(0,props.selectedContainerNames.length)
        let containers = getContainerList()
        if (containers.length===1) {
            props.selectedContainerNames.push(...containers)
            props.onSelect([...props.selectedNamespaces], [...props.selectedPodNames], [...props.selectedContainerNames])
        }

        setRender(!render)
    };

    const onPodNameChange = (event : any) => {
        props.selectedPodNames.splice(0,props.selectedPodNames.length)
        props.selectedPodNames.push( ...event.target.value )

        props.selectedContainerNames.splice(0,props.selectedContainerNames.length)
        let containers = getContainerList()
        if (containers.length===1) props.selectedContainerNames.push(...containers)

        props.onSelect([...props.selectedNamespaces], [...props.selectedPodNames], [...props.selectedContainerNames])

        setRender(!render)
    };

    const onContainerNameChange = (event : any) => {
        props.selectedContainerNames.splice(0,props.selectedContainerNames.length)
        props.selectedContainerNames.push( ...event.target.value )
        props.onSelect([...props.selectedNamespaces], [...props.selectedPodNames], [...props.selectedContainerNames])
    };

    const existAccessKey = (namespace:string) => {
        if (!props.cluster.accessKeys.has(InstanceConfigScopeEnum.VIEW)) return false
        let accessKey = props.cluster.accessKeys.get(InstanceConfigScopeEnum.VIEW)
        if (accessKey) {
            let resources = parseResources(accessKey.resources)
            return (resources.find(resource => resource.namespaces === namespace))
        }
        else return false

    }

    const getPodList = () => {
        return Array.from(pods.filter(m => props.selectedNamespaces.includes(m.namespace)))
    }

    const getContainerList = () => {
        if (props.selectedNamespaces.length===0 || props.selectedPodNames.length===0) return []
        let validpods = pods.filter(pod => props.selectedNamespaces.includes(pod.namespace))
        validpods = validpods.filter(p => props.selectedPodNames.includes(p.name))
        let validcontainers:string[] = []
        for (var p of validpods) {
            validcontainers.push ( ...p.containers )
        }
        return Array.from(new Set(validcontainers))
    }

    return (
        <Grid container direction='column' spacing={0} style={{marginBottom:6, width:'100%'}}>
            <Grid item>
                {
                    namespaceList.map ((ns,index) => {
                        if (props.disabled) {
                            if (existAccessKey(ns))
                                return <Chip component={'span'} key={index} label={ns as string} variant={props.selectedNamespaces.includes(ns)?'default':'outlined'} size='small' color='default' />
                            else
                                return <Chip component={'span'} key={index} label={ns as string} size='small' color='default' variant={'outlined'}/>
                        }
                        else {
                            if (existAccessKey(ns))
                                return <Chip component={'span'} key={index} label={ns as string} onClick={() => onNamespaceChange(ns)} variant={props.selectedNamespaces.includes(ns)?'default':'outlined'} size='small' color='primary' />
                            else
                                return <Chip component={'span'} key={index} label={ns as string} size='small' color='secondary' variant={'outlined'}/>
                        }
                    })
                }
            </Grid>
            <Grid container item xs={12} spacing={2}>
                <Grid item xs={6}>
                    <FormControl size='small' fullWidth>
                        <Select value={props.selectedPodNames} MenuProps={{variant:'menu'}} multiple onChange={onPodNameChange} renderValue={(selected) => (selected as string[]).join(', ')} disabled={props.disabled || props.selectedNamespaces.length===0 || getPodList().length===1}>
                            {
                                getPodList().map(pod => {
                                    return (
                                        <MenuItem key={pod.name} value={pod.name}>
                                            <Checkbox checked={props.selectedPodNames.includes(pod.name)} />
                                            <ListItemText primary={pod.name} />
                                        </MenuItem>
                                    )
                                })
                            }
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={6}>
                    <FormControl size='small' fullWidth>
                        <Select value={props.selectedContainerNames}  MenuProps={{variant:'menu'}} multiple onChange={onContainerNameChange} renderValue={(selected) => (selected as string[]).join(', ')} disabled={props.disabled || props.selectedPodNames.length===0 || getContainerList().length===1}>
                            {
                                getContainerList().map(container => {
                                    return (
                                        <MenuItem key={container} value={container}>
                                            <Checkbox checked={props.selectedContainerNames.includes(container)} />
                                            <ListItemText primary={container} />
                                        </MenuItem>
                                    )
                                })
                            }
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>
        </Grid>
    )
}

export { ObjectSelector }