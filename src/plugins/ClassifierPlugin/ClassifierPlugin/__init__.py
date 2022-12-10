"""
This is where the implementation of the plugin code goes.
The ClassifierPlugin-class is imported from both run_plugin.py and run_debug.py
"""
import sys
import logging
from webgme_bindings import PluginBase

# Setup a logger
logger = logging.getLogger('ClassifierPlugin')
logger.setLevel(logging.INFO)
handler = logging.StreamHandler(sys.stdout)  # By default it logs to stderr..
handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)


class ClassifierPlugin(PluginBase):
    def main(self):
        core = self.core
        root_node = self.root_node
        active_node = self.active_node

        name = core.get_attribute(active_node, 'name')

        logger.info('ActiveNode at "{0}" has name {1}'.format(core.get_path(active_node), name))

        core.set_attribute(active_node, 'name', 'newName')

        commit_info = self.util.save(root_node, self.commit_hash, 'master', 'Python plugin updated the model')
        logger.info('committed :{0}'.format(commit_info))
    
        nodes = self.core.load_own_sub_tree(self.active_node)
        self.transitions = self.getTransitions(nodes);
        self.places = self.getPlaces(nodes);
        self.arcsPlaceToTrans= self.getArcs("ArcPlaceToTrans", nodes);
        self.arcsTransToPlace = self.getArcs("ArcTransToPlace", nodes);
        self.inputMat = self.getInput();
        self.outputMat = self.getOutput();

        self.send_notification(self.petriNetsType())

    def getMetaName(self,node):
        return self.core.get_attribute(self.core.get_meta_type(node), "name")
    
    def getArcs(self,metaName,nodes):
        arcs=[]
        for node in nodes:
            if self.getMetaName(node)==metaName:
                arc={}
                arc['src']=self.core.get_pointer_path(node, 'src')
                arc['dst']=self.core.get_pointer_path(node, 'dst')
                arcs.append(arc)
        return arcs

    def getPlaces(self,nodes):
        places=[]
        for node in nodes:
            if self.getMetaName(node)=='Place':
                place={}
                place['id']=self.core.get_path(node)
                place['node']=node
                places.append(place)
        return places

    def getTransitions(self,nodes):
        transitions=[]
        for node in nodes:
            if self.getMetaName(node)=='Transition':
                transition={}
                transition['id']=self.core.get_path(node)
                transition['node']=node
                transitions.append(transition)
        return transitions

    def getFromPlaceToTrans(self,placeId,transId):
        for arc in self.arcsPlaceToTrans:
            if arc['src']==placeId and arc['dst']==transId:
                return True
        return False

    def getFromTransToPlace(self,placeId,transId):
        for arc in self.arcsPlaceToTrans:
            if arc['src']==transId and arc['dst']==placeId:
                return True
        return False
    
    def getOutput(self):
        outputMat={}
        for place in self.places:
            pid=place['id']
            outputMat[pid]={}
            for transition in self.transitions:
                tid=transition['id']
                outputMat[pid][tid]=self.getFromPlaceToTrans(pid,tid)
        return outputMat

    def getInput(self):
        inputMat={}
        for place in self.places:
            pid=place['id']
            inputMat[pid]={}
            for transition in self.transitions:
                tid=transition['id']
                inputMat[pid][tid]=self.getFromTransToPlace(pid,tid)
        return inputMat
    
    def petriNetsType(self):
        if len(self.places)==1 and len(self.transition)==0:
            return 'WORK_FLOW'

        def stateMachineType(self):
            for transition in self.transitions:
                tid=transition['id']
                pidsIn=[]
                for pid in self.inputMat.keys():
                    if self.inputMat[pid][tid]==True:
                        pidsIn.append(pid)
                pidsOut=[]
                for pid in self.outputMat.keys():
                    if self.outputMat[pid][tid]==True:
                        pidsOut.append(pid)
                if not (len(pidsIn)==1 and len(pidsOut)==1):
                    return False
            return True

        def markedGraphType(self):
            for place in self.places:
                pid=place['id']
                tidsIn=[]
                for tid in self.inputMat[pid].keys():
                    if self.inputMat[pid][tid]==True:
                        tidsIn.append(tid)
                tidsOut=[]
                for tid in self.outputMat[pid].keys():
                    if self.outputMat[pid][tid]==True:
                        tidsOut.append(tid)
                if not (len(tidsIn)==1 and len(tidsOut)==1):
                    return False
            return True

        def workFlowType(self):
            sourceIds=[]
            for pid in self.inputMat.keys():
                flag=True
                for tid in self.inputMat[pid].keys():
                    if self.inputMat[pid][tid]==True:
                        flag=False
                        break
                if flag==True:
                    sourceIds.append(pid)
            sinkIds=[]
            for pid in self.outputMat.keys():
                flag=True
                for tid in self.outputMat[pid].keys():
                    if self.outputMat[pid][tid]==True:
                        flag=False
                        break
                if flag==True:
                    sinkIds.append(pid)
            if len(sourceIds)!=1 or len(sinkIds)!=1:
                return False
            
            startId=sourceIds[0]
            queue=[]
            visited=set()
            visited.add(startId)

            placeIds=[]
            for place in self.places:
                placeIds.append(place['id'])
            transIds=[]
            for transition in self.transitions:
                transIds.append(transition['id'])

            element=startId
            allIds=placeIds+transIds
            allIds.remove(startId)
            queue.append(startId)
            while len(queue)!=0:
                e=queue[0]
                queue.pop(0)
                element=e
                if e in placeIds:
                    for tid in self.outputMat[e].keys():
                        if tid not in visited:
                            visited.add(tid)
                            allIds.remove(tid)
                            queue.append(tid)
                            for pid in self.inputMat.keys():
                                if self.inputMat[pid][tid] and (pid not in visited):
                                    visited.add(pid)
                                    allIds.remove(pid)
                                    queue.append(pid)
            
            if element==sinkIds[0] and len(allIds)==0:
                return True
            else:
                return False

        def freeChoiceType(self):
            tmap={}
            for transition in self.transitions:
                tid=transition['id']
                tmap[tid]=[]
                for pid in self.outputMat.keys():
                    if self.outputMat[pid][tid]==True:
                       tmap[tid].append(pid)
            import operator
            for tkey1 in tmap.keys():
                t1=tmap[tkey1]
                for tkey2 in tmap.keys():
                    t2=tmap[tkey2]
                    if not (list(set(t1).intersection(set(t2))) or operator.eq(t1,t2)):
                        return False
            return True
                
        if stateMachineType(self):
            return 'STATE_MACHINE'
        if markedGraphType(self):
            return 'MARKED_GRAPH'
        if workFlowType(self):
            return 'WORK_FLOW'
        if freeChoiceType(self):
            return 'FREE_CHOICE'
        return 'UNKNOWN_TYPE'