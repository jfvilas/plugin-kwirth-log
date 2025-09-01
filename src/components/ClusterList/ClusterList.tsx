import React from 'react'
import Box from '@material-ui/core/Box'
import CardHeader from '@material-ui/core/CardHeader'
import Divider from '@material-ui/core/Divider'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemText from '@material-ui/core/ListItemText'
import Typography from '@material-ui/core/Typography'
import { makeStyles, Theme } from '@material-ui/core/styles'
import { ClusterValidPods } from '@jfvilas/plugin-kwirth-common'

interface IProps {
	resources: ClusterValidPods[]
	selectedClusterName: string
	onSelect:(name:string|undefined) => void
}

const useStyles = makeStyles((_theme: Theme) => ({
    clusterBox: {
      display: 'flex',
      marginTop: '8px',
    },
}));
   
const ClusterList = (props: IProps) => {  
    const classes=useStyles();
    const { resources, selectedClusterName, onSelect } = props;
  
	const prepareText = (txt:string|undefined) => {
		return txt? (txt.length>25? txt.substring(0,25)+"...":txt) : 'N/A'
	}

	return (
		<>
		<CardHeader title={'Clusters'}/>
		
		<Divider style={{marginTop:8}}/>

		<List dense>
			{resources.map((cluster, index) => (
			<ListItem button key={index} selected={selectedClusterName === cluster.name} onClick={() => onSelect(cluster.name)} disabled={cluster.data.length===0}>
				<ListItemText
					primary={prepareText(cluster.name)}
					secondary={
						<Box component={'span'} className={classes.clusterBox}>
							<Typography component={'span'} style={{fontSize:12}}>
								{prepareText(cluster.title)}
							</Typography>
						</Box>
				}
				/>
			</ListItem>
			))}
		</List>
		</>
	)
}

export { ClusterList }