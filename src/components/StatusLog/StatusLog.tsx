import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@material-ui/core'
import { InstanceMessageTypeEnum, SignalMessageLevelEnum } from '@jfvilas/kwirth-common'
import { IStatusLine } from '@jfvilas/plugin-kwirth-common';

interface IProps {
    level: SignalMessageLevelEnum
    statusMessages: IStatusLine[]
    onClear: (level:SignalMessageLevelEnum) => void
    onClose: () => void
}

const StatusLog = (props:IProps) => {
    return (
        <Dialog open={true}>
            <DialogTitle>
                Stauts: {props.level} 
            </DialogTitle>
            <DialogContent>
                { props.statusMessages.filter(m => m.type === InstanceMessageTypeEnum.SIGNAL && m.level === props.level).map( (m,index) => <Typography key={index}>{m.text}</Typography>) }
            </DialogContent>
            <DialogActions>
                <Button onClick={() => props.onClear(props.level)} color='primary' variant='contained'>Clear</Button>
                <Button onClick={props.onClose} color='primary' variant='contained'>Close</Button>
            </DialogActions>
        </Dialog>
    )

}

export { StatusLog }