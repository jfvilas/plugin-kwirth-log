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
import { ClusterValidPods, getVersion, requestAccess } from '@jfvilas/plugin-kwirth-common'
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
    // +++ test
    async getVersion() : Promise<string> {
        return getVersion(this.discoveryApi, this.fetchApi)
    }
    // async getVersion(): Promise<string> {
    //     try {
    //         const baseUrl = await this.discoveryApi.getBaseUrl('kwirth')
    //         const targetUrl = `${baseUrl}/version`

    //         const result = await this.fetchApi.fetch(targetUrl)
    //         const data = await result.json()

    //         if (!result.ok) {
    //             throw new Error(`getVersion error: not ok`)
    //         }
    //         return data.version
    //     }
    //     catch (err) {
    //         throw new Error(`getVersion error: ${err}`)
    //     }
    // }

    async getResources(entity:Entity): Promise<ClusterValidPods> {
        try {
            const baseUrl = await this.discoveryApi.getBaseUrl('kwirth')
            const targetUrl = `${baseUrl}/start`

            var payload=JSON.stringify(entity)
            const result = await this.fetchApi.fetch(targetUrl, {method:'POST', body:payload, headers:{'Content-Type':'application/json'}})
            const data = await result.json() as ClusterValidPods

            if (!result.ok) {
                throw new Error(`getResources error: not ok`)
            }
            return data
        }
        catch (err) {
            throw new Error(`getResources error: ${err}`)
        }
    }

    async requestAccess(entity:Entity, channel:string, scopes:InstanceConfigScopeEnum[]): Promise<ClusterValidPods[]> {
        return requestAccess(this.discoveryApi, this.fetchApi, entity, channel, scopes)
    }

    // async requestAccess(entity:Entity, channel:string, scopes:InstanceConfigScopeEnum[]): Promise<ClusterValidPods[]> {
    //     try {
    //         const baseUrl = await this.discoveryApi.getBaseUrl('kwirth')
    //         var targetUrl:URL= new URL (`${baseUrl}/access`)
    //         targetUrl.searchParams.append('scopes',scopes.join(','))
    //         targetUrl.searchParams.append('channel',channel)

    //         var payload=JSON.stringify(entity)
    //         const result = await this.fetchApi.fetch(targetUrl, {method:'POST', body:payload, headers:{'Content-Type':'application/json'}})
    //         const data = await result.json() as ClusterValidPods[]

    //         // we reconstruct the 'Map' from string of arrays
    //         for (var c of data) {
    //             c.accessKeys = new Map(JSON.parse(((c as any).accessKeys)))
    //         }
    //         if (!result.ok) {
    //             throw new Error(`requestAccess error: not ok`)
    //         }
    //         return data
    //     }
    //     catch (err) {
    //         throw new Error(`requestAccess error: ${err}`)
    //     }
    // }

}
