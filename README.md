# PetriNets
This repository is intended to give examples of PetriNets. The project is for CS 6388 Model-Integrated Computing. Based on WebGME, It includes the seeds, plugin and visualization. The seeds basically a pre-work of the plugin and visualization. It defines the concept of networks. Plugin is a classifier that can tell which type of petri nets the example belongs to. The visualization is a simulator and shows how the network work. 

## Use case
Structural analysis may provide insights to biologists. For example, pathways may be automatically constructed from data residing in metabolic and sequence databases. By comparing pathways in different organisms, gaps in specific pathways were identified.4 In Zevedei-Oaneca and Schuster,3 structural analysis explained a surprising finding that indicated that an enzyme (triose-phosphate isomerase) is necessary for the glycolysis pathway, although it seemed possible for this pathway to proceed without it.
Petri Nets have also been used to model ecological and evolutionary processes and to analyze different modes of evolution.6 In this work, ecological niches were defined as a structural property of PNs: a set of interconnected autonomous places. A niche does not produce any indispensable resource for another niche.


## Initialization
Just clone the repo and open the dictionary
We use vitural machine in windows to finish this project.
- install vitural box, create VM.
- install Ubuntu.
- run `apt-get install nodejs` for install nodejs.
- run `npm install` to install dependence.
- run `npm start` to start.
- open browser and input http://localhost:8888 to access the WebGME website. Then creat a new project, choosing the seed project as initializer.

## Modeling
Open PetriNet instance and switch to the composition page. Drag the place and transition to the right place, make the line with them.
Now can open the PetriNetSim page to run the simulator.

## Function
I implemented the seeds and plugin. Visualization is difficult for me.
- Open the state machine composition page and design the network.
- Press the classify botton on sim page, then will show the petri nets type: statemachine, freechoice, workflow or markedgraph.
- Press the fire botton to run an events.
- Press reset botton to reset the machine.
- Once there is a deadlock, it will be shown.
