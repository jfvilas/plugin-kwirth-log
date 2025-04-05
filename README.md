# Backstage frontend KwirthLog plugin
This package is a Backstage plugin for **viewing Kubernetes logs** in real-time (live-streaming) via Kwirth.

**NOTE: KwithLog requires Kwirth vesrsion 0.3.155 or greater**

This Backstage plugin allows you to live-stream Kubernetes logs associated to your Backstage entities directly inside your Backstage instance. It's very important to understand that for this plugin to work you need to install Kwirth on your Kubernetes cluster, that is, this plugin is just another front end for [Kwirth](https://jfvilas.github.io/kwirth).

Kwirth is a really-easy-to-use data-exporting system for Kubernetes that runs in only one pod (*no database is needed*). Refer to Kwirth GitHub project for [info on installation](https://github.com/jfvilas/kwirth?tab=readme-ov-file#installation). Kwirth installation is *one command away* from you.

You can access [Kwirth project here](https://github.com/jfvilas/kwirth).


## What is this plugin for?
This Backstage plugin adds Backstage a feature for viewing real-time Kubernetes logs of your Backstage entities directly inside Backstage frontend application. The plugin will be enabled for any entity that is corectly tagged (according to Backstage Kubernetes core feature) and its correpsonding Kubernetes resources are found on any of the clusters that have been added to Backstage.

When KwirthLog is correctly installed and configured, it is possible to view Kubernetes logs on your Backstage like in this sample:

![kwirth-running](https://raw.githubusercontent.com/jfvilas/plugin-kwirth-log/master/images/kwirthlog-running.png)

This frontend plugin includes just the visualization of log information. All needed configuration, and specially **permission settings**, are done in the backend plugin and the app-config.yaml. You can restrict access to pods, namespaces, clusters, etc... by configuring permissions to be applied on the backend plugin.

## How does it work?
Let's explain this by following a user working sequence:

1. A Backstage user searchs for an entity in the Backstage.
2. In the entity page there will be a new tab named 'KWIRTHLOG'.
3. When the user clicks on KWIRTHLOG the frontend plugin sends a request to the backend Kiwrth plugin asking for logging information on all Kubernetes clusters available.
4. The Kwirth backend plugin sends requests to the Kwirth instances that are running inside all the clusters added to Backstage. These requests ask for the following: *'Tell me all the pods that are labeled with the kubernetes-id label and do correspond with the entity I'm looking for'*. In response to this query, each Kwirth instance answers with a list of pods and the namespaces where they are running.
5. The Kwirth backend plugin checks then the permissions of the connected user and prunes the pods list removing the ones that the user has not access to.
6. With the final pod list, the backend plugin sends requests to the Kwirth instances on the clusters asking for API Keys specific for streaming pod logs.
7. With all this information, the backend builds a unique response containing all the pods the user have access to, and all the API keys needed to access those logs.

If everyting is correctly configured and tagged, the user should see a list of clusters. When selecting a cluster, the user should see a list of namespaces where the entity is running.


## Installation
It's very simple and straightforward, it is in fact very similar to any other forntend Backstage plugin.

1. Install corresponding Backstage backend plugin [more information here](https://www.npmjs.com/package/@jfvilas/plugin-kwirth-backend).

2. Install this Backstage frontend plugin:

    ```bash
    # From your Backstage root directory
    yarn --cwd packages/app add @jfvilas/plugin-kwirth-log @jfvilas/plugin-kwirth-common
    ```

3. Make sure the [Kwirth backend plugin](https://www.npmjs.com/package/@jfvilas/plugin-kwirth-backend#configure) is installed and configured.

4. Restart your Backstage instance.


## Configuration: Entity Pages
For Kwirth plugin to be usable on the frontend, you must tailor your Entity Page to include the Kwirth components.

1. Add the plugin as a tab in your Entity pages:

    Firstly, import the plugin module.
    ```typescript
    // In packages/app/src/components/catalog/EntityPage.tsx
    import { EntityKwirthLogContent, isKirthAvailable } from '@jfvilas/plugin-kwirth-log';
    ```

    Then, add a tab to your EntityPage (the 'if' is optional, you can keep the 'KwirthLog' tab always visible if you prefer to do it that way).
    ````jsx
    // Note: Add to any other Pages as well (e.g. defaultEntityPage or webSiteEntityPage, for example)
    const serviceEntityPage = (
      <EntityLayout>
        {/* other tabs... */}
        <EntityLayout.Route if={isKwirthAvailable} path="/kwirthlog" title="KwirthLog">
          <EntityKwirthLogContent />
        </EntityLayout.Route>
      </EntityLayout>
    )
    ```

2. Add `backstage.io/kubernetes-id` annotation to your `catalog-info.yaml` for the entities deployed to Kubernetes whose logs you want to be 'viewable' on Backstage. This is the same annotation that the Kubernetes core plugin uses, so, maybe you already have added it to your components.

    ```yaml
    metadata:
      annotaations:
        backstage.io/kubernetes-id: entity-name
    ```

3. Add proper **labels** to your Kubernetes objects so Backstage can *link* forward and backward the Backstage entities with the Kubernetes objects. To do this, you need to add `labels` to your Kubernetes YAML objects (please, don't get confused: **annotations in Backstage YAML, labels in Kubernetes YAML**). This is an example of a typical Kubernetes deployment with the required label:

    ```yaml
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: ijkl
      labels:
        backstage.io/kubernetes-id: ijkl
    spec:
      selector:
        matchLabels:
          app: ijkl
      template:
        metadata:
          name: 'ijkl-pod'
          labels:
            app: ijkl
            backstage.io/kubernetes-id: ijkl
        spec:
          containers:
            - name: ijkl
              image: your-OCI-image
        ...    
    ```

    Please note that the kubernetes-id label is **on the deployment** and on the **spec pod template** also.

## Ready, set, go!
If you followed all these steps and our work is well done (not sure on this), you would see a 'KwirthLog' tab in your **Entity Page**, like this one:

![kwirthlog-tab](https://raw.githubusercontent.com/jfvilas/plugin-kwirth-log/master/images/kwirthlog-tab.png)

When you access the tab, if you have not yet tagged your entities you would see a message like this one explaning how to do that:

![notfound](https://raw.githubusercontent.com/jfvilas/plugin-kwirth-log/master/images/kwirthlog-notfound.png)

Once you tagged your entities and your Kubernetes objects, you should see something similar to this:

![available](https://raw.githubusercontent.com/jfvilas/plugin-kwirth-log/master/images/kwirthlog-available.png)

KwirthLog is ready to show logs!!

Just *select the cluster* on the cluster card and eventually set the *options* you want for the log streaming. On the card on right, you will see all the Kubernetes namespaces available and a stream control (download, play, pause and stop). *Select a namespace*, and two selectros for 'pod' and 'conatiner' will become available just under the namespace chips.

Select the pod/pods and container/containers you want to stream log, *click PLAY* button and the party starts!!

Now you will see your log refreshing in real-time. If you selected more than one namespace/pod/contianer, the log stream will contain all the source log lines streamed following time line.

![running](https://raw.githubusercontent.com/jfvilas/plugin-kwirth-log/master/images/kwirthlog-running.png)

Feel free to open issues and ask for more features.

## Status information
When the log stream starts, and all along the life of the stream (until it gets stopped or the window is closed), you will receive status information regarding the kubernetes objects you are watching. This status information is shown on the top of the card (just at the immediate right of the cluster name) including 3 kinds of information:

  - **Info**. Informaiton regarding pod management at Kubernetes cluster level (new pod, pod ended or pod modified).
  - **Warning**. Warnings related to the log stream.
  - **Error**. If there is an error in the stream, like invalid key use, or erroneous pod tagging, erros will be shown here.

The icons will light up in its corresponding color when a new message arrives.

This is how it feels:
![status info](https://raw.githubusercontent.com/jfvilas/plugin-kwirth-log/master/images/status-info.png)
