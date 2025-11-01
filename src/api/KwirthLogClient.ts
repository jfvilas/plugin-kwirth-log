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
import { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api'
import { KwirthLogApi } from './types'
import { Entity } from '@backstage/catalog-model'
import { ClusterValidPods, getInfo, getResources, getVersion, IBackendInfo, requestAccess } from '@jfvilas/plugin-kwirth-common'
import { InstanceConfigScopeEnum } from '@jfvilas/kwirth-common'

export interface KwirthLogClientOptions {
    discoveryApi: DiscoveryApi
    fetchApi: FetchApi
}

export class KwirthLogClient implements KwirthLogApi {
    private readonly discoveryApi: DiscoveryApi
    private readonly fetchApi: FetchApi

    constructor(options: KwirthLogClientOptions) {
        this.discoveryApi = options.discoveryApi
        this.fetchApi = options.fetchApi
    }

    /**
     * 
     * @param entity 
     * @returns an array of clusters (with their correpsonding info) and a pod list for each, where the entity has been dicovered
     */
    async getVersion() : Promise<string> {
        return getVersion(this.discoveryApi, this.fetchApi)
    }

    async getInfo() : Promise<IBackendInfo> {
        return getInfo(this.discoveryApi, this.fetchApi)
    }

    async getResources(entity:Entity): Promise<ClusterValidPods> {
        return getResources(this.discoveryApi, this.fetchApi, entity)
    }

    async requestAccess(entity:Entity, channel:string, scopes:InstanceConfigScopeEnum[]): Promise<ClusterValidPods[]> {
        return requestAccess(this.discoveryApi, this.fetchApi, entity, channel, scopes)
    }

}
