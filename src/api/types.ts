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
import { Entity } from '@backstage/catalog-model'
import { createApiRef } from '@backstage/core-plugin-api'
import { InstanceConfigScopeEnum } from '@jfvilas/kwirth-common'
import { ClusterValidPods } from '@jfvilas/plugin-kwirth-common'

export interface KwirthLogApi {
    getResources(entity:Entity): Promise<any>
    requestAccess(entity:Entity, channel:string, scopes:InstanceConfigScopeEnum[]): Promise<ClusterValidPods[]>
    getVersion(): Promise<any>
    getInfo(): any
}

export const kwirthLogApiRef = createApiRef<KwirthLogApi>({
  id: 'plugin.kwirthlog.api',
})
