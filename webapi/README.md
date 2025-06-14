# Chat Copilot backend web API service

This directory contains the source code for Chat Copilot's backend web API service. The front end web application component can be found in the [webapp/](../webapp/) directory.

## Running the Chat Copilot sample

To configure and run either the full Chat Copilot application or only the backend API, please view the [main instructions](../README.md#instructions).

# (Under Development)

The following material is under development and may not be complete or accurate.

## Visual Studio Code

1. build (CopilotChatWebApi)
2. run (CopilotChatWebApi)
3. [optional] watch (CopilotChatWebApi)

## Visual Studio (2022 or newer)

1. Open the solution file in Visual Studio 2022 or newer (`CopilotChat.sln`).
2. In Solution Explorer, right-click on `CopilotChatWebApi` and select `Set as Startup Project`.
3. Start debugging by pressing `F5` or selecting the menu item `Debug`->`Start Debugging`.

4. **(Optional)** To enable support for uploading image file formats such as png, jpg and tiff, there are two options for `KernelMemory:ImageOcrType` section of `./appsettings.json`, the Tesseract open source library and Azure Form Recognizer.
   - **Tesseract** we have included the [Tesseract](https://www.nuget.org/packages/Tesseract) nuget package.
     - You will need to obtain one or more [tessdata language data files](https://github.com/tesseract-ocr/tessdata) such as `eng.traineddata` and add them to your `./data` directory or the location specified in the `KernelMemory:Services:Tesseract:FilePath` location in `./appsettings.json`.
     - Set the `Copy to Output Directory` value to `Copy if newer`.
   - **Azure AI Doc Intel** we have included the [Azure.AI.FormRecognizer](https://www.nuget.org/packages/Azure.AI.FormRecognizer) nuget package.
     - You will need to obtain an [Azure AI Doc Intel](https://azure.microsoft.com/en-us/products/ai-services/ai-document-intelligence) resource and add the `KernelMemory:Services:AzureAIDocIntel:Endpoint` and `KernelMemory:Services:AzureAIDocIntel:Key` values to the `./appsettings.json` file.

## Running [Memory Service](https://github.com/microsoft/kernel-memory)

The memory service handles the creation and querying of kernel memory, including cognitive memory and documents.

### InProcess Processing (Default)

Running the memory creation pipeline in the webapi process. This also means the memory creation is synchronous.

No additional configuration is needed.

> You can choose either **Volatile** or **TextFile** as the SimpleVectorDb implementation.

### Distributed Processing

Running the memory creation pipeline steps in different processes. This means the memory creation is asynchronous. This allows better scalability if you have many chat sessions active at the same time or you have big documents that require minutes to process.

1. In [./webapi/appsettings.json](./appsettings.json), set `KernelMemory:DataIngestion:OrchestrationType` to `Distributed`.
2. In [../memorypipeline/appsettings.json](../memorypipeline/appsettings.json), set `KernelMemory:DataIngestion:OrchestrationType` to `Distributed`.
3. Make sure the following settings in the [./webapi/appsettings.json](./appsettings.json) and [../memorypipeline/appsettings.json](../memorypipeline/appsettings.json) respectively point to the same locations on your machine so that both processes can access the data:
   - `KernelMemory:Services:SimpleFileStorage:Directory`
   - `KernelMemory:Services:SimpleQueues:Directory`
   - `KernelMemory:Services:SimpleVectorDb:Directory`
     > Do not configure SimpleVectorDb to use Volatile. Volatile storage cannot be shared across processes.
4. You need to run both the [webapi](./README.md) and the [memorypipeline](../memorypipeline/README.md).

### (Optional) Use hosted resources: [Azure Storage Account](https://learn.microsoft.com/en-us/azure/storage/common/storage-account-overview), [Azure Cognitive Search](https://learn.microsoft.com/en-us/azure/search/search-what-is-azure-search)

1. In [./webapi/appsettings.json](./appsettings.json) and [../memorypipeline/appsettings.json](../memorypipeline/appsettings.json), set `KernelMemory:DocumentStorageType` to `AzureBlobs`.
2. In [./webapi/appsettings.json](./appsettings.json) and [../memorypipeline/appsettings.json](../memorypipeline/appsettings.json), set `KernelMemory:DataIngestion:DistributedOrchestration:QueueType` to `AzureQueue`.
3. In [./webapi/appsettings.json](./appsettings.json) and [../memorypipeline/appsettings.json](../memorypipeline/appsettings.json), set `KernelMemory:DataIngestion:MemoryDbTypes:0` to `AzureAISearch`.
4. In [./webapi/appsettings.json](./appsettings.json) and [../memorypipeline/appsettings.json](../memorypipeline/appsettings.json), set `KernelMemory:Retrieval:MemoryDbType` to `AzureAISearch`.
5. Run the following to set up the authentication to the resources:

   ```bash
   dotnet user-secrets set KernelMemory:Services:AzureBlobs:Auth ConnectionString
   dotnet user-secrets set KernelMemory:Services:AzureBlobs:ConnectionString [your secret]
   dotnet user-secrets set KernelMemory:Services:AzureQueue:Auth ConnectionString   # Only needed when running distributed processing
   dotnet user-secrets set KernelMemory:Services:AzureQueue:ConnectionString [your secret]   # Only needed when running distributed processing
   dotnet user-secrets set KernelMemory:Services:AzureAISearch:Endpoint [your secret]
   dotnet user-secrets set KernelMemory:Services:AzureAISearch:APIKey [your secret]
   ```

6. For more information and other options, please refer to the [memorypipeline](../memorypipeline/README.md).

## Adding OpenAI Plugins to the WebApi

You can also add OpenAI plugins that will be managed by the webapi (as opposed to being managed by the webapp). Soon, all OpenAI plugins will be managed by the webapi.

> By default, a third party OpenAI plugin called [Klarna Shopping](https://www.klarna.com/international/press/klarna-brings-smoooth-shopping-to-chatgpt/) is already added.

Please refer to [here](../plugins/README.md) for more details.

## (Optional) Enabling Cosmos Chat Store.

[Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/introduction) can be used as a persistent chat store for Chat Copilot. Chat stores are used for storing chat sessions, participants, and messages.

### Prerequisites

#### 1. Containers and PartitionKeys

In an effort to optimize performance, each container must be created with a specific partition key:
| Store | ContainerName | PartitionKey |
| ----- | ------------- | ------------ |
| Chat Sessions | chatsessions | /id (default) |
| Chat Messages | chatmessages | /chatId |
| Chat Memory Sources | chatmemorysources | /chatId |
| Chat Partipants | chatparticipants | /userId |

> For existing customers using CosmosDB before [Release 0.3](https://github.com/microsoft/chat-copilot/releases/tag/0.3), our recommendation is to remove the existing Cosmos DB containers and redeploy to realize the performance update related to the partition schema. To preserve existing chats, containers can be migrated as described [here](https://learn.microsoft.com/en-us/azure/cosmos-db/intra-account-container-copy#copy-a-container).

## (Optional) Enabling the Qdrant Memory Store

By default, the service uses an in-memory volatile memory store that, when the service stops or restarts, forgets all memories.
[Qdrant](https://github.com/qdrant/qdrant) is a persistent scalable vector search engine that can be deployed locally in a container or [at-scale in the cloud](https://github.com/Azure-Samples/qdrant-azure).

To enable the Qdrant memory store, you must first deploy Qdrant locally and then configure the Chat Copilot API service to use it.

### 1. Configure your environment

Before you get started, make sure you have the following additional requirements in place:

- [Docker Desktop](https://www.docker.com/products/docker-desktop) for hosting the [Qdrant](https://github.com/qdrant/qdrant) vector search engine.

### 2. Deploy Qdrant VectorDB locally

1. Open a terminal and use Docker to pull down the container image.

   ```bash
   docker pull qdrant/qdrant
   ```

2. Change directory to this repo and create a `./data/qdrant` directory to use as persistent storage.
   Then start the Qdrant container on port `6333` using the `./data/qdrant` folder as the persistent storage location.

   ```bash
   mkdir ./data/qdrant
   docker run --name copilotchat -p 6333:6333 -v "$(pwd)/data/qdrant:/qdrant/storage" qdrant/qdrant
   ```

   > To stop the container, in another terminal window run `docker container stop copilotchat; docker container rm copilotchat;`.

## (Optional) Enabling the Azure Cognitive Search Memory Store

Azure Cognitive Search can be used as a persistent memory store for Chat Copilot.
The service uses its [vector search](https://learn.microsoft.com/en-us/azure/search/vector-search-overview) capabilities.

## (Optional) Enable Application Insights telemetry

Enabling telemetry on CopilotChatApi allows you to capture data about requests to and from the API, allowing you to monitor the deployment and monitor how the application is being used.

To use Application Insights, first create an instance in your Azure subscription that you can use for this purpose.

On the resource overview page, in the top right use the copy button to copy the Connection String and paste this into the `APPLICATIONINSIGHTS_CONNECTION_STRING` setting as either a appsettings value, or add it as a secret.

In addition to this there are some custom events that can inform you how users are using the service such as `PluginFunction`.

To access these custom events the suggested method is to use Azure Data Explorer (ADX). To access data from Application Insights in ADX, create a new dashboard and add a new Data Source (use the ellipsis dropdown in the top right).

In the Cluster URI use the following link: `https://ade.applicationinsights.io/subscriptions/<Your subscription Id>`. The subscription id is shown on the resource page for your Applications Insights instance. You can then select the Database for the Application Insights resource.

For more info see [Query data in Azure Monitor using Azure Data Explorer](https://learn.microsoft.com/en-us/azure/data-explorer/query-monitor-data).

CopilotChat specific events are in a table called `customEvents`.

For example to see the most recent 100 plugin function invocations:

```kql
customEvents
| where timestamp between (_startTime .. _endTime)
| where name == "PluginFunction"
| extend plugin = tostring(customDimensions.pluginName)
| extend function = tostring(customDimensions.functionName)
| extend success = tobool(customDimensions.success)
| extend userId = tostring(customDimensions.userId)
| extend environment = tostring(customDimensions.AspNetCoreEnvironment)
| extend pluginFunction = strcat(plugin, '/', function)
| project timestamp, pluginFunction, success, userId, environment
| order by timestamp desc
| limit 100
```

Or to report the success rate of plugin functions against environments, you can first add a parameter to the dashboard to filter the environment.

You can use this query to show the environments available by adding the `Source` as this `Query`:

```kql
customEvents
| where timestamp between (['_startTime'] .. ['_endTime']) // Time range filtering
| extend environment = tostring(customDimensions.AspNetCoreEnvironment)
| distinct environment
```

Name the variable `_environment`, select `Multiple Selection` and tick `Add empty "Select all" value`. Finally `Select all` as the `Default value`.

You can then query the success rate with this query:

```kql
customEvents
| where timestamp between (_startTime .. _endTime)
| where name == "PluginFunction"
| extend plugin = tostring(customDimensions.pluginName)
| extend function = tostring(customDimensions.functionName)
| extend success = tobool(customDimensions.success)
| extend environment = tostring(customDimensions.AspNetCoreEnvironment)
| extend pluginFunction = strcat(plugin, '/', function)
| summarize Total=count(), Success=countif(success) by pluginFunction, environment
| project pluginFunction, SuccessPercentage = 100.0 * Success/Total, environment
| order by SuccessPercentage asc
```

You may wish to use the Visual tab to turn on conditional formatting to highlight low success rates or render it as a chart.

Finally you could render this data over time with a query like this:

```kql
customEvents
| where timestamp between (_startTime .. _endTime)
| where name == "PluginFunction"
| extend plugin = tostring(customDimensions.pluginName)
| extend function = tostring(customDimensions.functionName)
| extend success = tobool(customDimensions.success)
| extend environment = tostring(customDimensions.AspNetCoreEnvironment)
| extend pluginFunction = strcat(plugin, '/', function)
| summarize Total=count(), Success=countif(success) by pluginFunction, environment, bin(timestamp,1m)
| project pluginFunction, SuccessPercentage = 100.0 * Success/Total, environment, timestamp
| order by timestamp asc
```

Then use a Time chart on the Visual tab.

## (Optional) Custom Semantic Kernel Setup

### Adding Custom Plugins

> Though plugins can contain both semantic and native functions, Chat Copilot currently only supports plugins of isolated types due to import limitations, so you must separate your plugins into respective folders for each.

If you wish to load custom plugins into the kernel:

1. Create two new folders under `./Plugins` directory named `./SemanticPlugins` and `./NativePlugins`. There, you can add your custom plugins (synonymous with plugins).
2. Then, comment out the respective options in `appsettings.json`:

   ```json
   "Service": {
      // "TimeoutLimitInS": "120"
      "SemanticPluginsDirectory": "./Plugins/SemanticPlugins",
      "NativePluginsDirectory": "./Plugins/NativePlugins"
      // "KeyVault": ""
      // "InMaintenance":  true
   },
   ```

3. If you want to load the plugins into the core chat Kernel, you'll have to add the plugin registration into the `AddSemanticKernelServices` method of `SemanticKernelExtensions.cs`. Uncomment the line with `services.AddKernelSetupHook` and pass in the `RegisterPluginsAsync` hook:

   ```c#
   internal static IServiceCollection AddSemanticKernelServices(this IServiceCollection services)
   {
      ...

      // Add any additional setup needed for the kernel.
      // Uncomment the following line and pass in your custom hook.
      builder.Services.AddKernelSetupHook(RegisterPluginsAsync);

      return services;
   }
   ```

#### Deploying with Custom Plugins

If you want to deploy your custom plugins with the webapi, additional configuration is required. You have the following options:

1. **[Recommended]** Create custom setup hooks to import your plugins into the kernel.

   > The default `RegisterPluginsAsync` function uses reflection to import native functions from your custom plugin files. C# reflection is a powerful but slow mechanism that dynamically inspects and invokes types and methods at runtime. It works well for loading a few plugin files, but it can degrade performance and increase memory usage if you have many plugins or complex types. Therefore, we recommend creating your own import function to load your custom plugins manually. This way, you can avoid reflection overhead and have more control over how and when your plugins are loaded.

   Create a function to load your custom plugins at build and pass that function as a hook to `AddKernelSetupHook` in `SemanticKernelExtensions.cs`. See the [next two sections](#add-custom-setup-to-chat-copilots-kernel) for details on how to do this. This bypasses the need to load the plugins at runtime, and consequently, there's no need to ship the source files for your custom plugins. Remember to comment out the `NativePluginsDirectory` or `SemanticPluginsDirectory` options in `appsettings.json` to prevent any potential pathing errors.

Alternatively,

2. If you want to use local files for custom plugins and don't mind exposing your source code, you need to make sure that the files are copied to the output directory when you publish or run the app. The deployed app expects to find the files in a subdirectory specified by the `NativePluginsDirectory` or `SemanticPluginsDirectory` option, which is relative to the assembly location by default. To copy the files to the output directory,

   Mark the files and the subdirectory as Copy to Output Directory in the project file or the file properties. For example, if your files are in a subdirectories called `Plugins\NativePlugins` and `Plugins\SemanticPlugins`, you can uncomment the following lines the `CopilotChatWebApi.csproj` file:

   ```xml
   <Content Include="Plugins\NativePlugins\*.*">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </Content>
    <Content Include="Plugins\SemanticPlugins\*.*">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </Content>
   ```

3. Change the respective directory option to use an absolute path or a different base path, but make sure that the files are accessible from that location.

### Add Custom Setup to Chat Copilot's Kernel

Chat Copilot's Semantic Kernel can be customized with additional plugins or settings by using a custom hook that performs any complimentary setup of the kernel. A custom hook is a delegate that takes an `IServiceProvider` and an `Kernel` as parameters and performs any desired actions on the kernel, such as registering additional plugins, setting kernel options, adding dependency injections, importing data, etc. To use a custom hook, you can pass it as an argument to the `AddKernelSetupHook` call in the `AddSemanticKernelServices` method of `SemanticKernelExtensions.cs`.

For example, the following code snippet shows how to create a custom hook that registers a plugin called MyPlugin and passes it to `AddKernelSetupHook`:

```c#

// Define a custom hook that registers MyPlugin with the kernel
private static Task MyCustomSetupHook(IServiceProvider sp, Kernel kernel)
{
   // Import your plugin into the kernel with the name "MyPlugin"
   kernel.ImportFunctions(new MyPlugin(), nameof(MyPlugin));

   // Perform any other setup actions on the kernel
   // ...
}

```

Then in the `AddSemanticKernelServices` method of `SemanticKernelExtensions.cs`, pass your hook into the `services.AddKernelSetupHook` call:

```c#

internal static IServiceCollection AddSemanticKernelServices(this IServiceCollection services)
{
   ...

   // Add any additional setup needed for the kernel.
   // Uncomment the following line and pass in your custom hook.
   builder.Services.AddKernelSetupHook(MyCustomSetupHook);

   return services;
}

```

---

# Chat Copilot 后端 Web API 服务

此目录包含 Chat Copilot 后端 Web API 服务的源代码。前端 Web 应用程序组件可在 [webapp/](../webapp/) 目录中找到。

## 运行 Chat Copilot 示例

要配置和运行完整的 Chat Copilot 应用程序或仅运行后端 API，请查看[主要说明](../README.md#instructions)。

# （开发中）

以下材料正在开发中，可能不完整或不准确。

## Visual Studio Code

1. 构建（CopilotChatWebApi）
2. 运行（CopilotChatWebApi）
3. [可选] 监视（CopilotChatWebApi）

## Visual Studio（2022 或更新版本）

1. 在 Visual Studio 2022 或更新版本中打开解决方案文件（`CopilotChat.sln`）。
2. 在解决方案资源管理器中，右键单击 `CopilotChatWebApi` 并选择"设为启动项目"。
3. 按 `F5` 或选择菜单项"调试"->"开始调试"开始调试。

4. **（可选）** 要启用对上传图像文件格式（如 png、jpg 和 tiff）的支持，在 `./appsettings.json` 的 `KernelMemory:ImageOcrType` 部分有两个选项：Tesseract 开源库和 Azure Form Recognizer。
   - **Tesseract** 我们已包含 [Tesseract](https://www.nuget.org/packages/Tesseract) NuGet 包。
     - 您需要获取一个或多个 [tessdata 语言数据文件](https://github.com/tesseract-ocr/tessdata)，如 `eng.traineddata`，并将它们添加到您的 `./data` 目录或 `./appsettings.json` 中 `KernelMemory:Services:Tesseract:FilePath` 指定的位置。
     - 将"复制到输出目录"值设置为"如果较新则复制"。
   - **Azure AI Doc Intel** 我们已包含 [Azure.AI.FormRecognizer](https://www.nuget.org/packages/Azure.AI.FormRecognizer) NuGet 包。
     - 您需要获取 [Azure AI Doc Intel](https://azure.microsoft.com/en-us/products/ai-services/ai-document-intelligence) 资源，并将 `KernelMemory:Services:AzureAIDocIntel:Endpoint` 和 `KernelMemory:Services:AzureAIDocIntel:Key` 值添加到 `./appsettings.json` 文件中。

## 运行 [内存服务](https://github.com/microsoft/kernel-memory)

内存服务处理内核内存的创建和查询，包括认知内存和文档。

### 进程内处理（默认）

在 webapi 进程中运行内存创建管道。这也意味着内存创建是同步的。

无需额外配置。

> 您可以选择 **Volatile** 或 **TextFile** 作为 SimpleVectorDb 实现。

### 分布式处理

在不同进程中运行内存创建管道步骤。这意味着内存创建是异步的。如果您同时有许多活跃的聊天会话或有需要几分钟处理的大文档，这可以实现更好的可扩展性。

1. 在 [./webapi/appsettings.json](./appsettings.json) 中，将 `KernelMemory:DataIngestion:OrchestrationType` 设置为 `Distributed`。
2. 在 [../memorypipeline/appsettings.json](../memorypipeline/appsettings.json) 中，将 `KernelMemory:DataIngestion:OrchestrationType` 设置为 `Distributed`。
3. 确保 [./webapi/appsettings.json](./appsettings.json) 和 [../memorypipeline/appsettings.json](../memorypipeline/appsettings.json) 中的以下设置分别指向您机器上的相同位置，以便两个进程都可以访问数据：
   - `KernelMemory:Services:SimpleFileStorage:Directory`
   - `KernelMemory:Services:SimpleQueues:Directory`
   - `KernelMemory:Services:SimpleVectorDb:Directory`
     > 不要将 SimpleVectorDb 配置为使用 Volatile。Volatile 存储无法在进程间共享。
4. 您需要同时运行 [webapi](./README.md) 和 [memorypipeline](../memorypipeline/README.md)。

### （可选）使用托管资源：[Azure 存储帐户](https://learn.microsoft.com/en-us/azure/storage/common/storage-account-overview)，[Azure 认知搜索](https://learn.microsoft.com/en-us/azure/search/search-what-is-azure-search)

1. 在 [./webapi/appsettings.json](./appsettings.json) 和 [../memorypipeline/appsettings.json](../memorypipeline/appsettings.json) 中，将 `KernelMemory:DocumentStorageType` 设置为 `AzureBlobs`。
2. 在 [./webapi/appsettings.json](./appsettings.json) 和 [../memorypipeline/appsettings.json](../memorypipeline/appsettings.json) 中，将 `KernelMemory:DataIngestion:DistributedOrchestration:QueueType` 设置为 `AzureQueue`。
3. 在 [./webapi/appsettings.json](./appsettings.json) 和 [../memorypipeline/appsettings.json](../memorypipeline/appsettings.json) 中，将 `KernelMemory:DataIngestion:MemoryDbTypes:0` 设置为 `AzureAISearch`。
4. 在 [./webapi/appsettings.json](./appsettings.json) 和 [../memorypipeline/appsettings.json](../memorypipeline/appsettings.json) 中，将 `KernelMemory:Retrieval:MemoryDbType` 设置为 `AzureAISearch`。
5. 运行以下命令设置对资源的身份验证：

   ```bash
   dotnet user-secrets set KernelMemory:Services:AzureBlobs:Auth ConnectionString
   dotnet user-secrets set KernelMemory:Services:AzureBlobs:ConnectionString [您的密钥]
   dotnet user-secrets set KernelMemory:Services:AzureQueue:Auth ConnectionString   # 仅在运行分布式处理时需要
   dotnet user-secrets set KernelMemory:Services:AzureQueue:ConnectionString [您的密钥]   # 仅在运行分布式处理时需要
   dotnet user-secrets set KernelMemory:Services:AzureAISearch:Endpoint [您的密钥]
   dotnet user-secrets set KernelMemory:Services:AzureAISearch:APIKey [您的密钥]
   ```

6. 有关更多信息和其他选项，请参阅 [memorypipeline](../memorypipeline/README.md)。

## 向 WebApi 添加 OpenAI 插件

您还可以添加将由 webapi 管理的 OpenAI 插件（而不是由 webapp 管理）。很快，所有 OpenAI 插件都将由 webapi 管理。

> 默认情况下，已添加一个名为 [Klarna Shopping](https://www.klarna.com/international/press/klarna-brings-smoooth-shopping-to-chatgpt/) 的第三方 OpenAI 插件。

请参阅[此处](../plugins/README.md)了解更多详细信息。

## （可选）启用 Cosmos 聊天存储

[Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/introduction) 可用作 Chat Copilot 的持久聊天存储。聊天存储用于存储聊天会话、参与者和消息。

### 先决条件

#### 1. 容器和分区键

为了优化性能，每个容器必须使用特定的分区键创建：
| 存储 | 容器名称 | 分区键 |
| ----- | ------------- | ------------ |
| 聊天会话 | chatsessions | /id（默认） |
| 聊天消息 | chatmessages | /chatId |
| 聊天内存源 | chatmemorysources | /chatId |
| 聊天参与者 | chatparticipants | /userId |

> 对于在[发布版本 0.3](https://github.com/microsoft/chat-copilot/releases/tag/0.3)之前使用 CosmosDB 的现有客户，我们建议删除现有的 Cosmos DB 容器并重新部署，以实现与分区架构相关的性能更新。要保留现有聊天，可以如[此处](https://learn.microsoft.com/en-us/azure/cosmos-db/intra-account-container-copy#copy-a-container)所述迁移容器。

## （可选）启用 Qdrant 内存存储

默认情况下，服务使用内存中的易失性内存存储，当服务停止或重启时，会忘记所有内存。
[Qdrant](https://github.com/qdrant/qdrant) 是一个持久的可扩展向量搜索引擎，可以在容器中本地部署或[在云中大规模部署](https://github.com/Azure-Samples/qdrant-azure)。

要启用 Qdrant 内存存储，您必须首先在本地部署 Qdrant，然后配置 Chat Copilot API 服务使用它。

### 1. 配置您的环境

在开始之前，请确保您具备以下额外要求：

- 用于托管 [Qdrant](https://github.com/qdrant/qdrant) 向量搜索引擎的 [Docker Desktop](https://www.docker.com/products/docker-desktop)。

### 2. 在本地部署 Qdrant VectorDB

1. 打开终端并使用 Docker 拉取容器镜像。

   ```bash
   docker pull qdrant/qdrant
   ```

2. 切换到此存储库目录并创建 `./data/qdrant` 目录用作持久存储。
   然后在端口 `6333` 上启动 Qdrant 容器，使用 `./data/qdrant` 文件夹作为持久存储位置。

   ```bash
   mkdir ./data/qdrant
   docker run --name copilotchat -p 6333:6333 -v "$(pwd)/data/qdrant:/qdrant/storage" qdrant/qdrant
   ```

   > 要停止容器，在另一个终端窗口中运行 `docker container stop copilotchat; docker container rm copilotchat;`。

## （可选）启用 Azure 认知搜索内存存储

Azure 认知搜索可用作 Chat Copilot 的持久内存存储。
该服务使用其[向量搜索](https://learn.microsoft.com/en-us/azure/search/vector-search-overview)功能。

## （可选）启用 Application Insights 遥测

在 CopilotChatApi 上启用遥测允许您捕获有关 API 请求和响应的数据，使您能够监控部署并监控应用程序的使用情况。

要使用 Application Insights，首先在您的 Azure 订阅中创建一个可用于此目的的实例。

在资源概述页面的右上角，使用复制按钮复制连接字符串，并将其粘贴到 `APPLICATIONINSIGHTS_CONNECTION_STRING` 设置中，作为 appsettings 值或将其添加为密钥。

除此之外，还有一些自定义事件可以告诉您用户如何使用服务，例如 `PluginFunction`。

访问这些自定义事件的建议方法是使用 Azure 数据资源管理器（ADX）。要在 ADX 中访问来自 Application Insights 的数据，请创建新仪表板并添加新数据源（使用右上角的省略号下拉菜单）。

在集群 URI 中使用以下链接：`https://ade.applicationinsights.io/subscriptions/<您的订阅 ID>`。订阅 ID 显示在您的 Application Insights 实例的资源页面上。然后您可以为 Application Insights 资源选择数据库。

有关更多信息，请参阅[使用 Azure 数据资源管理器查询 Azure Monitor 中的数据](https://learn.microsoft.com/en-us/azure/data-explorer/query-monitor-data)。

CopilotChat 特定事件位于名为 `customEvents` 的表中。

例如，要查看最近 100 次插件函数调用：

```kql
customEvents
| where timestamp between (_startTime .. _endTime)
| where name == "PluginFunction"
| extend plugin = tostring(customDimensions.pluginName)
| extend function = tostring(customDimensions.functionName)
| extend success = tobool(customDimensions.success)
| extend userId = tostring(customDimensions.userId)
| extend environment = tostring(customDimensions.AspNetCoreEnvironment)
| extend pluginFunction = strcat(plugin, '/', function)
| project timestamp, pluginFunction, success, userId, environment
| order by timestamp desc
| limit 100
```

或者报告环境中插件函数的成功率，您可以首先向仪表板添加参数以过滤环境。

您可以使用此查询通过将 `Source` 添加为此 `Query` 来显示可用环境：

```kql
customEvents
| where timestamp between (['_startTime'] .. ['_endTime']) // 时间范围过滤
| extend environment = tostring(customDimensions.AspNetCoreEnvironment)
| distinct environment
```

将变量命名为 `_environment`，选择"多选"并勾选"添加空的'全选'值"。最后选择"全选"作为"默认值"。

然后您可以使用此查询查询成功率：

```kql
customEvents
| where timestamp between (_startTime .. _endTime)
| where name == "PluginFunction"
| extend plugin = tostring(customDimensions.pluginName)
| extend function = tostring(customDimensions.functionName)
| extend success = tobool(customDimensions.success)
| extend environment = tostring(customDimensions.AspNetCoreEnvironment)
| extend pluginFunction = strcat(plugin, '/', function)
| summarize Total=count(), Success=countif(success) by pluginFunction, environment
| project pluginFunction, SuccessPercentage = 100.0 * Success/Total, environment
| order by SuccessPercentage asc
```

您可能希望使用可视化选项卡打开条件格式以突出显示低成功率或将其呈现为图表。

最后，您可以使用如下查询随时间呈现此数据：

```kql
customEvents
| where timestamp between (_startTime .. _endTime)
| where name == "PluginFunction"
| extend plugin = tostring(customDimensions.pluginName)
| extend function = tostring(customDimensions.functionName)
| extend success = tobool(customDimensions.success)
| extend environment = tostring(customDimensions.AspNetCoreEnvironment)
| extend pluginFunction = strcat(plugin, '/', function)
| summarize Total=count(), Success=countif(success) by pluginFunction, environment, bin(timestamp,1m)
| project pluginFunction, SuccessPercentage = 100.0 * Success/Total, environment, timestamp
| order by timestamp asc
```

然后在可视化选项卡上使用时间图表。

## （可选）自定义语义内核设置

### 添加自定义插件

> 尽管插件可以包含语义和本机函数，但由于导入限制，Chat Copilot 目前仅支持隔离类型的插件，因此您必须将插件分别分离到相应的文件夹中。

如果您希望将自定义插件加载到内核中：

1. 在 `./Plugins` 目录下创建两个新文件夹，分别命名为 `./SemanticPlugins` 和 `./NativePlugins`。在那里，您可以添加您的自定义插件（与插件同义）。
2. 然后，在 `appsettings.json` 中注释掉相应的选项：

   ```json
   "Service": {
      // "TimeoutLimitInS": "120"
      "SemanticPluginsDirectory": "./Plugins/SemanticPlugins",
      "NativePluginsDirectory": "./Plugins/NativePlugins"
      // "KeyVault": ""
      // "InMaintenance":  true
   },
   ```

3. 如果您想将插件加载到核心聊天内核中，您必须将插件注册添加到 `SemanticKernelExtensions.cs` 的 `AddSemanticKernelServices` 方法中。取消注释带有 `services.AddKernelSetupHook` 的行并传入 `RegisterPluginsAsync` 钩子：

   ```c#
   internal static IServiceCollection AddSemanticKernelServices(this IServiceCollection services)
   {
      ...

      // 为内核添加任何其他所需的设置。
      // 取消注释以下行并传入您的自定义钩子。
      builder.Services.AddKernelSetupHook(RegisterPluginsAsync);

      return services;
   }
   ```

#### 使用自定义插件部署

如果您想使用 webapi 部署自定义插件，需要额外的配置。您有以下选项：

1. **[推荐]** 创建自定义设置钩子以将您的插件导入内核。

   > 默认的 `RegisterPluginsAsync` 函数使用反射从您的自定义插件文件导入本机函数。C# 反射是一种强大但缓慢的机制，在运行时动态检查和调用类型和方法。它适用于加载少量插件文件，但如果您有许多插件或复杂类型，它可能会降低性能并增加内存使用量。因此，我们建议创建您自己的导入函数来手动加载您的自定义插件。这样，您可以避免反射开销，并更好地控制如何以及何时加载插件。

   创建一个函数在构建时加载您的自定义插件，并将该函数作为钩子传递给 `SemanticKernelExtensions.cs` 中的 `AddKernelSetupHook`。有关如何执行此操作的详细信息，请参阅[接下来的两个部分](#add-custom-setup-to-chat-copilots-kernel)。这绕过了在运行时加载插件的需要，因此无需为您的自定义插件发送源文件。记住在 `appsettings.json` 中注释掉 `NativePluginsDirectory` 或 `SemanticPluginsDirectory` 选项以防止任何潜在的路径错误。

或者，

2. 如果您想为自定义插件使用本地文件并且不介意暴露您的源代码，您需要确保在发布或运行应用程序时将文件复制到输出目录。部署的应用程序期望在由 `NativePluginsDirectory` 或 `SemanticPluginsDirectory` 选项指定的子目录中找到文件，默认情况下该目录相对于程序集位置。要将文件复制到输出目录，

   在项目文件或文件属性中将文件和子目录标记为复制到输出目录。例如，如果您的文件位于名为 `Plugins\NativePlugins` 和 `Plugins\SemanticPlugins` 的子目录中，您可以在 `CopilotChatWebApi.csproj` 文件中取消注释以下行：

   ```xml
   <Content Include="Plugins\NativePlugins\*.*">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </Content>
    <Content Include="Plugins\SemanticPlugins\*.*">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </Content>
   ```

3. 更改相应的目录选项以使用绝对路径或不同的基路径，但确保文件可从该位置访问。

### 向 Chat Copilot 的内核添加自定义设置

Chat Copilot 的语义内核可以通过使用执行内核任何补充设置的自定义钩子来自定义额外的插件或设置。自定义钩子是一个委托，它接受 `IServiceProvider` 和 `Kernel` 作为参数，并在内核上执行任何所需的操作，例如注册额外的插件、设置内核选项、添加依赖注入、导入数据等。要使用自定义钩子，您可以将其作为参数传递给 `SemanticKernelExtensions.cs` 的 `AddSemanticKernelServices` 方法中的 `AddKernelSetupHook` 调用。

例如，以下代码片段显示如何创建注册名为 MyPlugin 的插件的自定义钩子并将其传递给 `AddKernelSetupHook`：

```c#

// 定义一个向内核注册 MyPlugin 的自定义钩子
private static Task MyCustomSetupHook(IServiceProvider sp, Kernel kernel)
{
   // 将您的插件导入内核，名称为"MyPlugin"
   kernel.ImportFunctions(new MyPlugin(), nameof(MyPlugin));

   // 在内核上执行任何其他设置操作
   // ...
}

```

然后在 `SemanticKernelExtensions.cs` 的 `AddSemanticKernelServices` 方法中，将您的钩子传递到 `services.AddKernelSetupHook` 调用中：

```c#

internal static IServiceCollection AddSemanticKernelServices(this IServiceCollection services)
{
   ...

   // 为内核添加任何其他所需的设置。
   // 取消注释以下行并传入您的自定义钩子。
   builder.Services.AddKernelSetupHook(MyCustomSetupHook);

   return services;
}

```