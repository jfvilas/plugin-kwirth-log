/*
Copyright 2024 Julio Fernandez

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
import React, { useRef, useState } from 'react'
import useAsync from 'react-use/esm/useAsync'

import { Progress, WarningPanel } from '@backstage/core-components'
import { useApi } from '@backstage/core-plugin-api'
import { ANNOTATION_KWIRTH_LOCATION, isKwirthAvailable, ClusterValidPods } from '@jfvilas/plugin-kwirth-common'
import { MissingAnnotationEmptyState, useEntity } from '@backstage/plugin-catalog-react'

// kwirthlog
import { kwirthLogApiRef } from '../../api'
import { accessKeySerialize, LogMessage, InstanceConfigActionEnum, InstanceConfigChannelEnum, InstanceConfigFlowEnum, InstanceConfigScopeEnum, InstanceConfigViewEnum, InstanceMessage, InstanceMessageTypeEnum, SignalMessage, SignalMessageLevelEnum, InstanceConfigObjectEnum, InstanceConfig } from '@jfvilas/kwirth-common'

// kwirthlog components
import { ComponentNotFound, ErrorType } from '../ComponentNotFound'
import { Options } from '../Options'
import { ClusterList } from '../ClusterList'
import { ShowError } from '../ShowError'
import { StatusLog } from '../StatusLog'


// Material-UI
import { Grid } from '@material-ui/core'
import { Card, CardHeader, CardContent } from '@material-ui/core'
import Divider from '@material-ui/core/Divider'
import IconButton from '@material-ui/core/IconButton'
import Typography from '@material-ui/core/Typography'

// Icons
import PlayIcon from '@material-ui/icons/PlayArrow'
import PauseIcon from '@material-ui/icons/Pause'
import StopIcon from '@material-ui/icons/Stop'
import InfoIcon from '@material-ui/icons/Info'
import WarningIcon from '@material-ui/icons/Warning'
import ErrorIcon from '@material-ui/icons/Error'
import DownloadIcon from '@material-ui/icons/CloudDownload'
import KwirthLogLogo from '../../assets/kwirthlog-logo.svg'
import { ObjectSelector } from '../ObjectSelector'

const LOG_MAX_MESSAGES=1000;

export const EntityKwirthLogContent = () => { 
    const { entity } = useEntity()
    const kwirthLogApi = useApi(kwirthLogApiRef)
    const [resources, setResources] = useState<ClusterValidPods[]>([])
    const [selectedClusterName, setSelectedClusterName] = useState('')
    const [_namespaceList, setNamespaceList] = useState<string[]>([]) //+++
    const [selectedNamespaces, setSelectedNamespaces] = useState<string[]>([])
    const [selectedPodNames, setSelectedPodNames] = useState<string[]>([])
    const [selectedContainerNames, setSelectedContainerNames] = useState<string[]>([])
    const [showError, setShowError] = useState('')  //+++ review if this is needed once we have errorMessages
    const [started, setStarted] = useState(false)
    const [stopped, setStopped] = useState(true)
    const paused=useRef<boolean>(false)
    const [messages, setMessages] = useState<LogMessage[]>([])
    const [pendingMessages, setPendingMessages] = useState<LogMessage[]>([])
    const [statusMessages, setStatusMessages] = useState<SignalMessage[]>([])
    const [websocket, setWebsocket] = useState<WebSocket>()
    const kwirthLogOptionsRef = useRef<any>({timestamp:false, follow:true, fromStart:false})
    const [showStatusDialog, setShowStatusDialog] = useState(false)
    const [statusLevel, setStatusLevel] = useState<SignalMessageLevelEnum>(SignalMessageLevelEnum.INFO)
    const preRef = useRef<HTMLPreElement|null>(null)
    const lastRef = useRef<HTMLPreElement|null>(null)
    const [ backendVersion, setBackendVersion ] = useState<string>('')
    const { loading, error } = useAsync ( async () => {
        if (backendVersion==='') setBackendVersion(await kwirthLogApi.getVersion())
        var data = await kwirthLogApi.requestAccess(entity,'log', [InstanceConfigScopeEnum.VIEW,InstanceConfigScopeEnum.RESTART])
        setResources(data)
    })

    const clickStart = (options:any) => {
        if (!paused.current) {
            setStarted(true)
            paused.current=false
            setStopped(false)
            startLogViewer(options)
        }
        else {
            setMessages( (prev) => [ ...prev, ...pendingMessages])
            setPendingMessages([])
            paused.current=false
            setStarted(true)
        }
    }

    const clickPause = () => {
        setStarted(false)
        paused.current=true
    }

    const clickStop = () => {
        setStarted(false)
        setStopped(true)
        paused.current=false
        stopLogViewer()
    }

    const onSelectCluster = (name:string|undefined) => {
        if (name) {
            setSelectedClusterName(name)
            resources.filter(cluster => cluster.name===name).map ( x => {
                var namespaces=Array.from(new Set(x.data.map ( (p:any) => p.namespace))) as string[]
                setNamespaceList(namespaces)
            })
            setMessages([{
                channel: InstanceConfigChannelEnum.LOG,
                type: InstanceMessageTypeEnum.SIGNAL,
                text: 'Select namespace in order to decide which pod logs to view.',
                instance: ''
            }])
            setSelectedNamespaces([])
            setSelectedPodNames([])
            setSelectedContainerNames([])
            setStatusMessages([])
            clickStop()
        }
    }

    const processLogMessage = (wsEvent:any) => {
        let msg = JSON.parse(wsEvent.data) as InstanceMessage
        switch (msg.type) {
            case 'data':
                var lmsg = msg as LogMessage
                if (paused.current) {
                    setPendingMessages((prev) => [ ...prev, lmsg ])
                }
                else {
                    setMessages((prev) => {
                        while (prev.length>LOG_MAX_MESSAGES-1) {
                            prev.splice(0,1)
                        }
                        if (kwirthLogOptionsRef.current.follow && lastRef.current) lastRef.current.scrollIntoView({ behavior: 'instant', block: 'start' })
                        return [ ...prev, lmsg ]
                    })
                }        
                break
            case 'signal':
                let smsg = msg as SignalMessage
                 setStatusMessages ((prev) => [...prev, smsg])
                break
            default:
                console.log('Invalid message type:')
                console.log(msg)
                setStatusMessages ((prev) => [...prev, {
                    channel: InstanceConfigChannelEnum.LOG,
                    type: InstanceMessageTypeEnum.SIGNAL,
                    level: SignalMessageLevelEnum.ERROR,
                    text: 'Invalid message type received: '+msg.type,
                    instance: ''
                }])
                break
        }
    }
    
    const websocketOnMessage = (wsEvent:any) => {
        let instanceMessage:InstanceMessage
        try {
            instanceMessage = JSON.parse(wsEvent.data) as InstanceMessage
        }
        catch (err) {
            console.log(err)
            console.log(wsEvent.data)
            return
        }

        switch(instanceMessage.channel) {
            case 'log':
                processLogMessage(wsEvent)
                break
            default:
                console.log('Invalid channel in message: ', instanceMessage)
                break
        }

    }

    const websocketOnOpen = (ws:WebSocket, options:any) => {
        let cluster=resources.find(cluster => cluster.name === selectedClusterName)
        if (!cluster) {
            //+++ setShowError(msg.text);
            return
        }
        let pods = cluster.data.filter(p => selectedNamespaces.includes(p.namespace))
        if (!pods) {
            //+++ setShowError(msg.text);
            return
        }
        console.log(`WS connected`)
        let accessKey = cluster.accessKeys.get(InstanceConfigScopeEnum.VIEW)
        if (accessKey) {
            let containers:string[] = []
            if (selectedContainerNames.length>0) {
                for(var p of selectedPodNames) {
                    for (var c of selectedContainerNames) {
                        containers.push(p+'+'+c)
                    }
                }
            }
            let iConfig:InstanceConfig = {
                channel: InstanceConfigChannelEnum.LOG,
                objects: InstanceConfigObjectEnum.PODS,
                action: InstanceConfigActionEnum.START,
                flow: InstanceConfigFlowEnum.REQUEST,
                instance: '',
                accessKey: accessKeySerialize(accessKey),
                scope: InstanceConfigScopeEnum.VIEW,
                view: (selectedContainerNames.length>0 ? InstanceConfigViewEnum.CONTAINER : InstanceConfigViewEnum.POD),
                namespace: selectedNamespaces.join(','),
                group: '',
                pod: selectedPodNames.map(p => p).join(','),
                container: containers.join(','),
                data: {
                    timestamp: options.timestamp,
                    previous: false,
                    maxMessages: LOG_MAX_MESSAGES,
                    fromStart: options.fromStart
                }
            }
            ws.send(JSON.stringify(iConfig))
        }
        else {
            // +++ error to user
        }
    }

    const startLogViewer = (options:any) => {
        let cluster=resources.find(cluster => cluster.name===selectedClusterName);
        if (!cluster) {
            //+++ show wargning
            return
        }

        setMessages([])
        try {
            let ws = new WebSocket(cluster.url)
            ws.onopen = () => websocketOnOpen(ws, options)
            ws.onmessage = (event) => websocketOnMessage(event)
            ws.onclose = (event) => websocketOnClose(event)
            setWebsocket(ws)
        }
        catch (err) {
            setMessages([ {
                channel: InstanceConfigChannelEnum.LOG,
                type: InstanceMessageTypeEnum.DATA,
                text: `Error opening log stream: ${err}`,
                instance: ''
            } ])
        }

    }

    const websocketOnClose = (_event:any) => {
      console.log(`WS disconnected`)
      setStarted(false)
      paused.current=false
      setStopped(true)
    }

    const stopLogViewer = () => {
        messages.push({
            channel: InstanceConfigChannelEnum.LOG,
            type: InstanceMessageTypeEnum.DATA,
            text: '============================================================================================================================',
            instance: ''
        })
        websocket?.close()
    }

    const onChangeLogConfig = (options:any) => {
        kwirthLogOptionsRef.current=options
        if (started) {
            clickStart(options)
        }
    }

    const handleDownload = () => {
      let content = preRef.current!.innerHTML.replaceAll('<pre>','').replaceAll('</pre>','\n')
      content = content.replaceAll('<span style="color: green;">','')
      content = content.replaceAll('<span style="color: blue;">','')
      content = content.replaceAll('</span>','')
      let filename = selectedClusterName+'-'+selectedNamespaces+'-'+entity.metadata.name+'.txt'
      let mimeType:string = 'text/plain'
  
      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  
    const actionButtons = () => {
        let hasViewKey=false
        let cluster=resources.find(cluster => cluster.name===selectedClusterName)
        if (cluster) hasViewKey = Boolean(cluster.accessKeys.get(InstanceConfigScopeEnum.VIEW))

        return <>
            <IconButton title='Download' onClick={handleDownload} disabled={messages.length<=1}>
                <DownloadIcon />
            </IconButton>
            <IconButton onClick={() => clickStart(kwirthLogOptionsRef.current)} title="Play" disabled={started || !paused || selectedPodNames.length === 0 || !hasViewKey}>
                <PlayIcon />
            </IconButton>
            <IconButton onClick={clickPause} title="Pause" disabled={!((started && !paused.current) && selectedPodNames.length > 0)}>
                <PauseIcon />
            </IconButton>
            <IconButton onClick={clickStop} title="Stop" disabled={stopped || selectedPodNames.length === 0}>
                <StopIcon />
            </IconButton>
        </>
    }

    const statusButtons = (title:string) => {
        const show = (level:SignalMessageLevelEnum) => {
            setShowStatusDialog(true)
            setStatusLevel(level)
        }

        return (
            <Grid container direction='row' >
                <Grid item>
                    <Typography variant='h5'>{title}</Typography>
                </Grid>
                <Grid item style={{marginTop:'-8px'}}>
                    <IconButton title="info" disabled={!statusMessages.some(m=>m.type === InstanceMessageTypeEnum.SIGNAL && m.level=== SignalMessageLevelEnum.INFO)} onClick={() => show(SignalMessageLevelEnum.INFO)}>
                        <InfoIcon style={{ color:statusMessages.some(m=>m.type === InstanceMessageTypeEnum.SIGNAL && m.level=== SignalMessageLevelEnum.INFO)?'blue':'#BDBDBD'}}/>
                    </IconButton>
                    <IconButton title="warning" disabled={!statusMessages.some(m=>m.type === InstanceMessageTypeEnum.SIGNAL && m.level=== SignalMessageLevelEnum.WARNING)} onClick={() => show(SignalMessageLevelEnum.WARNING)} style={{marginLeft:'-16px'}}>
                        <WarningIcon style={{ color:statusMessages.some(m=>m.type === InstanceMessageTypeEnum.SIGNAL && m.level=== SignalMessageLevelEnum.WARNING)?'gold':'#BDBDBD'}}/>
                    </IconButton>
                    <IconButton title="error" disabled={!statusMessages.some(m=>m.type === InstanceMessageTypeEnum.SIGNAL && m.level=== SignalMessageLevelEnum.ERROR)} onClick={() => show(SignalMessageLevelEnum.ERROR)} style={{marginLeft:'-16px'}}>
                        <ErrorIcon style={{ color:statusMessages.some(m=>m.type === InstanceMessageTypeEnum.SIGNAL && m.level=== SignalMessageLevelEnum.ERROR)?'red':'#BDBDBD'}}/>
                    </IconButton>
                </Grid>
            </Grid>
        )
    }

    const statusClear = (level: SignalMessageLevelEnum) => {
        setStatusMessages(statusMessages.filter(m=> m.level!==level))
        setShowStatusDialog(false)
    }
    
    const onSelectObject = (namespaces:string[], podNames:string[], containerNames:string[]) => {
        setSelectedNamespaces(namespaces)
        setSelectedPodNames(podNames)
        setSelectedContainerNames(containerNames)
    }

    const formatMessage = (m:LogMessage) => {
        if (!m.pod) {
            return <>{m.text+'\n'}</>
        }

        let podPrefix = <></>
        if (selectedPodNames.length !== 1) {
            podPrefix  = <span style={{color:"green"}}>{m.pod+' '}</span>
        }

        let containerPrefix = <></>
        if (selectedContainerNames.length !== 1){
            containerPrefix = <span style={{color:"blue"}}>{m.container+' '}</span>
        }
        return <>{podPrefix}{containerPrefix}{m.text+'\n'}</>
    }

    return (<>
        { showError!=='' && <ShowError message={showError} onClose={() => setShowError('')}/> }

        { loading && <Progress/> }

        {!isKwirthAvailable(entity) && !loading && error && (
            <WarningPanel title={'An error has ocurred while obtaining data from kuebernetes clusters.'} message={error?.message} />
        )}

        {!isKwirthAvailable(entity) && !loading && (
            <MissingAnnotationEmptyState readMoreUrl='https://github.com/jfvilas/plugin-kwirth-log' annotation={ANNOTATION_KWIRTH_LOCATION}/>
        )}

        { isKwirthAvailable(entity) && !loading && resources && resources.length===0 &&
            <ComponentNotFound error={ErrorType.NO_CLUSTERS} entity={entity}/>
        }

        { isKwirthAvailable(entity) && !loading && resources && resources.length>0 && resources.reduce((sum,cluster) => sum+cluster.data.length, 0)===0 &&
            <ComponentNotFound error={ErrorType.NO_PODS} entity={entity}/>
        }

        { isKwirthAvailable(entity) && !loading && resources && resources.length>0 && resources.reduce((sum,cluster) => sum+cluster.data.length, 0)>0 &&
            <Grid container direction='row' spacing={3}>
                <Grid container item xs={2} direction='column' spacing={3}>
                    <Grid item>
                        <Card>
                            <ClusterList resources={resources} selectedClusterName={selectedClusterName} onSelect={onSelectCluster}/>
                        </Card>
                    </Grid>
                    <Grid item>
                        <Card>
                            <Options options={kwirthLogOptionsRef.current} onChange={onChangeLogConfig} disabled={selectedContainerNames.length === 0 || started || paused.current}/>
                        </Card>
                    </Grid>
                </Grid>

                <Grid item xs={10}>

                    { !selectedClusterName && 
                        <img src={KwirthLogLogo} alt='No cluster selected' style={{ left:'40%', marginTop:'10%', width:'20%', position:'relative' }} />
                    }

                    { selectedClusterName && <>
                        <Card style={{ maxHeight:'75vh'}}>
                            <CardHeader
                                title={statusButtons(selectedClusterName)}
                                style={{marginTop:-4, marginBottom:4, flexShrink:0}}
                                action={actionButtons()}
                            />
                            
                            <Typography style={{marginLeft:16, marginBottom:4}}>
                                <ObjectSelector cluster={resources.find(cluster => cluster.name === selectedClusterName)!} onSelect={onSelectObject} disabled={selectedClusterName === '' || started || paused.current} selectedNamespaces={selectedNamespaces} selectedPodNames={selectedPodNames} selectedContainerNames={selectedContainerNames}/>
                            </Typography>
                            <Divider/>
                            <CardContent style={{ overflow: 'auto' }}>
                                <pre ref={preRef}>
                                    { messages.map (m => formatMessage(m)) }
                                </pre>
                                <span ref={lastRef}></span>
                            </CardContent>
                        </Card>
                    </>}

                </Grid>
            </Grid>
        }

        { showStatusDialog && <StatusLog level={statusLevel} onClose={() => setShowStatusDialog(false)} statusMessages={statusMessages} onClear={statusClear}/>}
    </>)
}
