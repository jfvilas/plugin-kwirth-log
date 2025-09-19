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
import React, { useRef, useState } from 'react'
import useAsync from 'react-use/esm/useAsync'

import { Progress, WarningPanel } from '@backstage/core-components'
import { alertApiRef, useApi } from '@backstage/core-plugin-api'
import { ANNOTATION_BACKSTAGE_KUBERNETES_LABELID, ANNOTATION_BACKSTAGE_KUBERNETES_LABELSELECTOR, isKwirthAvailable, ClusterValidPods, PodData, ILogLine, IStatusLine } from '@jfvilas/plugin-kwirth-common'
import { MissingAnnotationEmptyState, useEntity } from '@backstage/plugin-catalog-react'

// kwirthlog
import { kwirthLogApiRef } from '../../api'
import { accessKeySerialize, ILogMessage, InstanceMessageActionEnum, InstanceConfigScopeEnum, InstanceConfigViewEnum, InstanceMessage, InstanceMessageTypeEnum, SignalMessage, SignalMessageLevelEnum, InstanceConfigObjectEnum, InstanceConfig, InstanceMessageFlowEnum, InstanceMessageChannelEnum, IOpsMessage, OpsCommandEnum, IRouteMessage, IOpsMessageResponse } from '@jfvilas/kwirth-common'

// kwirthlog components
import { ComponentNotFound, ErrorType } from '../ComponentNotFound'
import { ObjectSelector } from '../ObjectSelector'
import { Options } from '../Options'
import { ClusterList } from '../ClusterList'
import { StatusLog } from '../StatusLog'


// Material-UI
import { Grid, Card, CardHeader, CardContent, Box } from '@material-ui/core'
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
import RefreshIcon from '@material-ui/icons/Refresh'
import { KwirthNews } from '../KwirthNews/KwirthNews'

const LOG_MAX_MESSAGES=1000

export const EntityKwirthLogContent = (props:{ enableRestart: boolean }) => { 
    const { entity } = useEntity()
    const kwirthLogApi = useApi(kwirthLogApiRef)
    const alertApi = useApi(alertApiRef)
    const [resources, setResources] = useState<ClusterValidPods[]>([])
    const [selectedClusterName, setSelectedClusterName] = useState('')
    const [selectedNamespaces, setSelectedNamespaces] = useState<string[]>([])
    const [selectedPodNames, setSelectedPodNames] = useState<string[]>([])
    const [selectedContainerNames, setSelectedContainerNames] = useState<string[]>([])
    const [started, setStarted] = useState(false)
    const [stopped, setStopped] = useState(true)
    const paused=useRef<boolean>(false)
    const [messages, setMessages] = useState<ILogLine[]>([])
    const [pendingMessages, setPendingMessages] = useState<ILogLine[]>([])
    const [statusMessages, setStatusMessages] = useState<IStatusLine[]>([])
    const [websocket, setWebsocket] = useState<WebSocket>()
    const [instance, setInstance] = useState<string>()
    const kwirthLogOptionsRef = useRef<any>({timestamp:false, follow:true, fromStart:false})
    const [showStatusDialog, setShowStatusDialog] = useState(false)
    const [statusLevel, setStatusLevel] = useState<SignalMessageLevelEnum>(SignalMessageLevelEnum.INFO)
    const preRef = useRef<HTMLPreElement|null>(null)
    const lastRef = useRef<HTMLPreElement|null>(null)
    const [ backendVersion, setBackendVersion ] = useState<string>('')
    const [ backendInfo, setBackendInfo ] = useState<any>(undefined)
    const { loading, error } = useAsync ( async () => {
        if (backendVersion==='') setBackendVersion(await kwirthLogApi.getVersion())
        if (!backendInfo) setBackendInfo(await kwirthLogApi.getInfo())
        let reqScopes = [InstanceConfigScopeEnum.VIEW]
        if (props.enableRestart) reqScopes.push(InstanceConfigScopeEnum.RESTART)
        let data:ClusterValidPods[] = await kwirthLogApi.requestAccess(entity, InstanceMessageChannelEnum.LOG, reqScopes)
        setResources(data)
    })
    const buffer = useRef<Map<string,string>>(new Map())

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

    const onClickPause = () => {
        setStarted(false)
        paused.current=true
    }

    const onClickStop = () => {
        setStarted(false)
        setStopped(true)
        paused.current=false
        stopLogViewer()
    }

    const onSelectCluster = (name:string|undefined) => {
        if (name) {
            setSelectedClusterName(name)
            setMessages([{
                type: InstanceMessageTypeEnum.SIGNAL,
                text: 'Select namespace in order to decide which pod logs to view.',
                namespace: '',
                pod: '',
                container: ''
            }])
            setSelectedNamespaces([])
            setSelectedPodNames([])
            setSelectedContainerNames([])
            setStatusMessages([])
            onClickStop()
        }
    }

    const processLogMessage = (wsEvent:any) => {
        let instanceMessage = JSON.parse(wsEvent.data) as InstanceMessage
        switch (instanceMessage.type) {
            case InstanceMessageTypeEnum.DATA:
                let logMessage = instanceMessage as ILogMessage
                let bname = logMessage.namespace+'/'+logMessage.pod+'/'+logMessage.container
                let text = logMessage.text
                if (!buffer.current.has(bname)) buffer.current.set(bname,'')
                if (buffer.current.get(bname)) {
                    text = buffer.current.get(bname) + text
                    buffer.current.set(bname,'')
                }
                if (!text.endsWith('\n')) {
                    let i = text.lastIndexOf('\n')
                    buffer.current.set(bname,text.substring(i))
                    text = text.substring(0,i)
                }

                for (let line of text.split('\n')) {
                    if (line.trim() === '') continue

                    let logLine:ILogLine = {
                        text: line,
                        namespace: logMessage.namespace,
                        pod: logMessage.pod,
                        container: logMessage.container,
                        type: logMessage.type
                    }

                    if (paused.current) {
                        setPendingMessages((prev) => [ ...prev, logLine ])
                    }
                    else {
                        setMessages((prev) => {
                            while (prev.length>LOG_MAX_MESSAGES-1) {
                                prev.splice(0,1)
                            }
                            if (kwirthLogOptionsRef.current.follow && lastRef.current) lastRef.current.scrollIntoView({ behavior: 'instant', block: 'start' })
                            return [ ...prev, logLine ]
                        })
                    }
                }
                break
            case InstanceMessageTypeEnum.SIGNAL:
                if (instanceMessage.flow === InstanceMessageFlowEnum.RESPONSE && instanceMessage.action === InstanceMessageActionEnum.START) {
                    if (instanceMessage.instance!=='')
                        setInstance(instanceMessage.instance)
                    else {
                        let signalMessage = instanceMessage as SignalMessage
                        alertApi.post({ message: signalMessage.text, severity:'error', display:'transient' })
                    }
                }
                else {
                    let signalMessage = instanceMessage as SignalMessage
                    addMessage(signalMessage.level, signalMessage.text)
                    switch(signalMessage.level) {
                        case SignalMessageLevelEnum.INFO:
                            alertApi.post({ message: signalMessage.text, severity:'info', display:'transient' })
                            break
                        case SignalMessageLevelEnum.WARNING:
                            alertApi.post({ message: signalMessage.text, severity:'warning', display:'transient' })
                            break
                        case SignalMessageLevelEnum.ERROR:
                            alertApi.post({ message: signalMessage.text, severity:'error', display:'transient' })
                            break
                        default:
                            alertApi.post({ message: signalMessage.text, severity:'success', display:'transient' })
                            break
                    }
                }
                break
            default:
                addMessage(SignalMessageLevelEnum.ERROR, 'Invalid message type received: ' + instanceMessage.type)
                alertApi.post({ message: 'Invalid message type received: ' + instanceMessage.type, severity:'error', display:'transient' })
                break
        }
    }

    const addMessage = (level:SignalMessageLevelEnum, text:string) => {
        setStatusMessages ((prev) => [...prev, {
            level,
            text,
            type: InstanceMessageTypeEnum.SIGNAL,
        }])
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
            case InstanceMessageChannelEnum.LOG:
                processLogMessage(wsEvent)
                break
            case InstanceMessageChannelEnum.OPS:
                let opsMessage = instanceMessage as IOpsMessageResponse
                if (opsMessage.data?.data) 
                    addMessage (SignalMessageLevelEnum.WARNING, 'Operations message: '+opsMessage.data.data)
                else
                    addMessage (SignalMessageLevelEnum.WARNING, 'Operations message: '+JSON.stringify(opsMessage))
                break
            default:
                addMessage (SignalMessageLevelEnum.ERROR, 'Invalid channel in message: '+instanceMessage.channel)
                addMessage (SignalMessageLevelEnum.ERROR, 'Invalid message: '+JSON.stringify(instanceMessage))
                break
        }
    }

    const websocketOnOpen = (ws:WebSocket, options:any) => {
        let cluster=resources.find(cluster => cluster.name === selectedClusterName)
        if (!cluster) {
            addMessage(SignalMessageLevelEnum.ERROR,'No cluster selected')
            return
        }
        let pods = cluster.data.filter(p => selectedNamespaces.includes(p.namespace))
        if (!pods) {
            addMessage(SignalMessageLevelEnum.ERROR,'No pods found')
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
                channel: InstanceMessageChannelEnum.LOG,
                objects: InstanceConfigObjectEnum.PODS,
                action: InstanceMessageActionEnum.START,
                flow: InstanceMessageFlowEnum.REQUEST,
                instance: '',
                accessKey: accessKeySerialize(accessKey),
                scope: InstanceConfigScopeEnum.VIEW,
                view: (selectedContainerNames.length > 0 ? InstanceConfigViewEnum.CONTAINER : InstanceConfigViewEnum.POD),
                namespace: selectedNamespaces.join(','),
                group: '',
                pod: selectedPodNames.map(p => p).join(','),
                container: containers.join(','),
                data: {
                    timestamp: options.timestamp,
                    previous: false,
                    maxMessages: LOG_MAX_MESSAGES,
                    fromStart: options.fromStart
                },
                type: InstanceMessageTypeEnum.SIGNAL
            }
            ws.send(JSON.stringify(iConfig))
        }
        else {
            addMessage(SignalMessageLevelEnum.ERROR,'No accessKey for starting log streaming')
            return
        }
    }

    const startLogViewer = (options:any) => {
        let cluster=resources.find(cluster => cluster.name===selectedClusterName);
        if (!cluster) {
            addMessage(SignalMessageLevelEnum.ERROR,'No cluster selected')
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
                type: InstanceMessageTypeEnum.DATA,
                text: `Error opening log stream: ${err}`,
                namespace: '',
                pod: '',
                container: ''
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
            type: InstanceMessageTypeEnum.DATA,
            text: '============================================================================================================================',
            namespace: '',
            pod: '',
            container: ''
        })
        websocket?.close()
    }

    const onChangeLogConfig = (options:any) => {
        kwirthLogOptionsRef.current=options
        if (started) {
            clickStart(options)
        }
    }

    const onClickDownload = () => {
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

    const onClickRestart = () => {
        // we perform a route command from channel 'log' to channel 'ops'
        var cluster=resources.find(cluster => cluster.name===selectedClusterName);
        if (!cluster) {
            addMessage(SignalMessageLevelEnum.ERROR,'No cluster selected')
            return
        }
        let restartKey = cluster.accessKeys.get(InstanceConfigScopeEnum.RESTART)
        if (!restartKey) {
            addMessage(SignalMessageLevelEnum.ERROR,'No access key present')
            return
        }
        if (!instance) {
            addMessage(SignalMessageLevelEnum.ERROR,'No instance has been established')
            return
        }

        let pods:PodData[] = (cluster.data as PodData[]).filter(pod => selectedNamespaces.includes(pod.namespace))
        for (let pod of pods) {
            let opsMessage:IOpsMessage = {
                msgtype: 'opsmessage',
                action: InstanceMessageActionEnum.COMMAND,
                flow: InstanceMessageFlowEnum.IMMEDIATE,
                type: InstanceMessageTypeEnum.DATA,
                channel: InstanceMessageChannelEnum.OPS,
                instance: '',
                id: '1',
                accessKey: accessKeySerialize(restartKey),
                command: OpsCommandEnum.RESTARTPOD,
                namespace: pod.namespace,
                group: '',
                pod: pod.name,
                container: ''
            }
            let routeMessage: IRouteMessage = {
                msgtype: 'routemessage',
                accessKey: accessKeySerialize(restartKey),
                destChannel: InstanceMessageChannelEnum.OPS,
                action: InstanceMessageActionEnum.ROUTE,
                flow: InstanceMessageFlowEnum.IMMEDIATE,
                type: InstanceMessageTypeEnum.SIGNAL,
                channel: InstanceMessageChannelEnum.LOG,
                instance: instance,
                data: opsMessage
            }
            websocket?.send(JSON.stringify(routeMessage))
        }
    }

    const actionButtons = () => {
        let hasViewKey=false, hasRestartKey = false
        let cluster=resources.find(cluster => cluster.name===selectedClusterName)
        if (cluster) {
            hasViewKey = Boolean(cluster.accessKeys.get(InstanceConfigScopeEnum.VIEW))
            hasRestartKey = Boolean(cluster.accessKeys.get(InstanceConfigScopeEnum.RESTART))
        }

        return <>
            { props.enableRestart &&
                <IconButton title='Restart' onClick={onClickRestart} disabled={selectedPodNames.length === 0 || !hasRestartKey || !websocket || !started}>
                    <RefreshIcon />
                </IconButton>
            }
            <IconButton title='Download' onClick={onClickDownload} disabled={messages.length<=1}>
                <DownloadIcon />
            </IconButton>
            <IconButton onClick={() => clickStart(kwirthLogOptionsRef.current)} title="Play" disabled={started || !paused || selectedPodNames.length === 0 || !hasViewKey}>
                <PlayIcon />
            </IconButton>
            <IconButton onClick={onClickPause} title="Pause" disabled={!((started && !paused.current) && selectedPodNames.length > 0)}>
                <PauseIcon />
            </IconButton>
            <IconButton onClick={onClickStop} title="Stop" disabled={stopped || selectedPodNames.length === 0}>
                <StopIcon />
            </IconButton>
        </>
    }

    const statusButtons = (title:string) => {
        const show = (level:SignalMessageLevelEnum) => {
            setShowStatusDialog(true)
            setStatusLevel(level)
        }

        const prepareText = (txt:string|undefined) => {
            return txt? (txt.length>25? txt.substring(0,25)+"...":txt) : 'N/A'
        }

        return (
            <Grid container direction='row' >
                <Grid item>
                    <Typography variant='h5'>{prepareText(title)}</Typography>
                </Grid>
                <Grid item style={{marginTop:'-8px'}}>
                    <IconButton title="info" disabled={!statusMessages.some(m=>m.type === InstanceMessageTypeEnum.SIGNAL && m.level=== SignalMessageLevelEnum.INFO)} onClick={() => show(SignalMessageLevelEnum.INFO)}>
                        <InfoIcon style={{ color:statusMessages.some(m=>m.type === InstanceMessageTypeEnum.SIGNAL && m.level=== SignalMessageLevelEnum.INFO)?'blue':'#BDBDBD'}}/>
                    </IconButton>
                    <IconButton title="warning" disabled={!statusMessages.some(m=>m.type === InstanceMessageTypeEnum.SIGNAL && m.level=== SignalMessageLevelEnum.WARNING)} onClick={() => show(SignalMessageLevelEnum.WARNING)} style={{marginLeft:'-16px'}}>
                        <WarningIcon style={{ color:statusMessages.some(m=>m.type === InstanceMessageTypeEnum.SIGNAL && m.level=== SignalMessageLevelEnum.WARNING)?'orange':'#BDBDBD'}}/>
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

    const formatMessage = (logLine:ILogLine) => {
        if (!logLine.pod) {
            return <>{logLine.text+'\n'}</>
        }

        let podPrefix = <></>
        if (selectedPodNames.length !== 1) {
            podPrefix  = <span style={{color:"green"}}>{logLine.pod+' '}</span>
        }

        let containerPrefix = <></>
        if (selectedContainerNames.length !== 1){
            containerPrefix = <span style={{color:"blue"}}>{logLine.container+' '}</span>
        }
        return <>{podPrefix}{containerPrefix}{logLine.text+'\n'}</>
    }

    return (<>

        { loading && <Progress/> }

        {!isKwirthAvailable(entity) && !loading && error && (
            <WarningPanel title={'An error has ocurred while obtaining data from kuebernetes clusters.'} message={error?.message} />
        )}

        {!isKwirthAvailable(entity) && !loading && (
            <MissingAnnotationEmptyState readMoreUrl='https://github.com/jfvilas/plugin-kwirth-log' annotation={[ANNOTATION_BACKSTAGE_KUBERNETES_LABELID, ANNOTATION_BACKSTAGE_KUBERNETES_LABELSELECTOR]}/>
        )}

        { isKwirthAvailable(entity) && !loading && resources && resources.length===0 &&
            <ComponentNotFound error={ErrorType.NO_CLUSTERS} entity={entity}/>
        }

        { isKwirthAvailable(entity) && !loading && resources && resources.length>0 && resources.reduce((sum,cluster) => sum+cluster.data.length, 0)===0 &&
            <ComponentNotFound error={ErrorType.NO_PODS} entity={entity}/>
        }

        { isKwirthAvailable(entity) && !loading && resources && resources.length>0 && resources.reduce((sum,cluster) => sum+cluster.data.length, 0)>0 &&
            <Box sx={{ display: 'flex', height:'70vh'}}>
                <Box sx={{ width: '200px', maxWidth:'200px'}}>
                    <Grid container direction='column'>
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
                        <Grid item>
                            <Card>
                                <KwirthNews latestVersions={backendInfo} backendVersion={backendVersion}/>
                            </Card>
                        </Grid>
                    </Grid>
                </Box>

                <Box sx={{ flexGrow: 1, flex:1, overflow:'hidden', p:1, marginLeft:'8px' }}>

                    { !selectedClusterName && 
                        <img src={KwirthLogLogo} alt='No cluster selected' style={{ left:'40%', marginTop:'10%', width:'20%', position:'relative' }} />
                    }

                    { selectedClusterName && <>
                        <Card style={{ marginTop:-8, height:'100%', display:'flex', flexDirection:'column' }}>
                            <CardHeader
                                title={statusButtons(selectedClusterName)}
                                style={{marginTop:-4, marginBottom:4, flexShrink:0}}
                                action={actionButtons()}
                            />
                            
                            <Typography style={{marginLeft:16, marginBottom:4}}>
                                <ObjectSelector cluster={resources.find(cluster => cluster.name === selectedClusterName)!} onSelect={onSelectObject} disabled={selectedClusterName === '' || started || paused.current} selectedNamespaces={selectedNamespaces} selectedPodNames={selectedPodNames} selectedContainerNames={selectedContainerNames}/>
                            </Typography>
                            <Divider/>
                            <CardContent style={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                <Box style={{ overflowY: 'auto', overflowX: 'auto', width: '100%', flexGrow: 1 }}>

                                    <pre ref={preRef}>
                                        { messages.map (m => formatMessage(m)) }
                                    </pre>
                                    <span ref={lastRef}/>
                                </Box>                                
                            </CardContent>
                        </Card>
                    </>}
                </Box>
            </Box>
        }
        { showStatusDialog && <StatusLog level={statusLevel} onClose={() => setShowStatusDialog(false)} statusMessages={statusMessages} onClear={statusClear}/>}
    </>)
}
