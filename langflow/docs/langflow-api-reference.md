
---

# Document: README

_Source: 

# API Examples (Local Test Harness)

Run all API example suites against a local Langflow server:

```bash
make api_examples_local
```

Run one test suite:

```bash
make api_examples_local suites=python
make api_examples_local suites=javascript
make api_examples_local suites=curl
```

The following examples are not executed in this harness:

- `api-build/build-flow-and-stream-events-2.py`
- `api-build/build-flow-and-stream-events-3.py`
- `api-flows-run/stream-llm-token-responses.py`
- `api-openai-responses/example-streaming-request.py`
- `api-logs/stream-logs.py`
- `api-logs/retrieve-logs-with-optional-parameters.py`
- `api-users/reset-password.py`

---

# Document: api-build

_Source: 

---
title: Build endpoints
slug: /api-build
---



:::info
The `/build` endpoints are used by Langflow's frontend visual editor code.
These endpoints are part of the internal Langflow codebase.

Don't use these endpoints to run flows in applications that use your Langflow flows.
To run flows in your apps, see [Flow trigger endpoints](/api-flows-run).
:::

The `/build` endpoints support Langflow's frontend code for building flows in the Langflow visual editor.
You can use these endpoints to build vertices and flows, as well as execute flows with streaming event responses.
You might need to use or understand these endpoints when contributing to the Langflow codebase.

## Build flow and stream events

This endpoint builds and executes a flow, returning a job ID that can be used to stream execution events.

1. Send a POST request to the `/build/$FLOW_ID/flow` endpoint:

    
    

    

    
    

    

    
    

    

    
    

    <details>
    <summary>Result</summary>

    

    </details>

2. After receiving a job ID from the build endpoint, use the `/build/$JOB_ID/events` endpoint to stream the execution results:

    
    

    

    
    

    

    
    

    

    
    

    <details>
    <summary>Result</summary>

    

    </details>

The `/build/$FLOW_ID/events` endpoint has a `stream` query parameter that defaults to `true`.
To disable streaming and get all events at once, set `?stream=false`.



















## Build headers

| Header | Info | Example |
|--------|------|---------|
| Content-Type | Required. Specifies the JSON format. | "application/json" |
| accept | Optional. Specifies the response format. | "application/json" |
| x-api-key | Optional. Required only if authentication is enabled. | "sk-..." |

## Build parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| inputs | object | Optional. Input values for flow components. |
| data | object | Optional. Flow data to override stored configuration. |
| files | array[string] | Optional. List of file paths to use. |
| start_component_id | string | Optional. ID of the component where the execution should start. Component `id` values can be found in [Langflow JSON files](/concepts-flows-import#langflow-json-file-contents) |
| stop_component_id | string | Optional. ID of the component where the execution should stop. Component `id` values can be found in [Langflow JSON files](/concepts-flows-import#langflow-json-file-contents).|
| log_builds | Boolean | Whether to record build logs. Default: Enabled (`true`). |

### Set start and stop points

The `/build` endpoint accepts optional values for `start_component_id` and `stop_component_id` to control where the flow run starts and stops.
Setting `stop_component_id` for a component triggers the same behavior as clicking **Run component** on that component in the visual editor: The specified component and all dependent components leading up to that component will run.

The following example stops flow execution at an **OpenAI** component:



















### Override flow parameters

The `/build` endpoint also accepts inputs for `data` directly, instead of using the values stored in the Langflow database.
This is useful for running flows without having to pass custom values through the visual editor.



















<details>
<summary>Result</summary>



</details>

## See also

- [Get Vertex builds](/api-monitor#get-vertex-builds)
- [Delete Vertex builds](/api-monitor#delete-vertex-builds)
- [Session ID](/session-id)


---

# Document: api-files

_Source: 

---
title: Files endpoints
slug: /api-files
---



Use the `/files` endpoints to move files between your local machine and Langflow.

All `/files` endpoints (both `/v1/files` and `/v2/files`) require authentication with a Langflow API key.
You can only access files that belong to your own user account, even as a superuser.

## Differences between `/v1/files` and `/v2/files`

There are two versions of the `/files` endpoints.

`/v2/files` offers the following improvements over `/v1/files`:

- `/v2` files are organized by `user_id` instead of `flow_id`.
  This means files are owned by users, and they aren't attached to specific flows.
  You can upload a file to Langflow one time, and use it with multiple flows.
- `/v2` files are tracked in the Langflow database.
- `/v2` supports bulk upload and delete.
- `/v2` responses contain more descriptive metadata.

However, `/v2/files` doesn't support image files.
To send image files to your flows through the API, use [Upload image files (v1)](#upload-image-files-v1).

## Files/V1 endpoints

Use the `/files` endpoints to move files between your local machine and Langflow.

### Upload file (v1)

Upload a file to the `v1/files/upload/$FLOW_ID` endpoint:
Replace **FILE_NAME** with the uploaded file name.



















Replace `FILE_NAME.txt` with the name and extension of the file you want to upload.
Not all file types are supported.

<details>
<summary>Result</summary>



</details>

### Upload image files (v1)

Send image files to Langflow to use them in flows.

The default file limit is 1024 MB.
To change this limit, set the `LANGFLOW_MAX_FILE_SIZE_UPLOAD` [environment variable](/environment-variables).

1. Attach the image to a `POST /v1/files/upload/$FLOW_ID` request with `--form` (`-F`) and the file path:

    
    

    

    
    

    

    
    

    

    
    

    A successful request returns the `file_path` for the image in the Langflow file management system in the format `FLOW_ID/TIMESTAMP_FILENAME.TYPE`.
    For example:

    ```json
    {
      "flowId": "a430cc57-06bb-4c11-be39-d3d4de68d2c4",
      "file_path": "a430cc57-06bb-4c11-be39-d3d4de68d2c4/2024-11-27_14-47-50_image-file.png"
    }
    ```

2. Use the returned `file_path` to send the image file to other components that can accept file input. Where you specify the file path depends on the component type.

    The following example runs the **Basic Prompting** template flow, passing the image file and the query `describe this image` as input for the **Chat Input** component.
    In this case, the file path is specified in `tweaks`.

    
    

    

    
    

    

    
    

    

    
    

    :::tip
    For help with tweaks, use the **Input Schema** in a flow's [**API access** pane](/concepts-publish#api-access).
    Setting tweaks with **Input Schema** also automatically populates the required component IDs.
    :::

### List files (v1)

List all files associated with a specific flow.



















<details>
<summary>Result</summary>



</details>

### Download file (v1)

Download a specific file from a flow.



















<details>
<summary>Result</summary>



</details>

### Delete file (v1)

Delete a specific file from a flow.



















<details>
<summary>Result</summary>



</details>

## Files/V2 endpoints

Use the `/files` endpoints to move files between your local machine and Langflow.

The `/v2/files` endpoints can be authenticated by an API key or JWT.
To create a Langflow API key and export it as an environment variable, see [Get started with the Langflow API](/api-reference-api-examples).

### Upload file (v2)

Upload a file to your user account. The file can be used across multiple flows.

The file is uploaded in the format `USER_ID/FILE_ID.FILE_EXTENSION`, such as `07e5b864-e367-4f52-b647-a48035ae7e5e/d44dc2e1-9ae9-4cf6-9114-8d34a6126c94.pdf`.

1. To retrieve your current `user_id`, call the `/whoami` endpoint:

    
    

    

    
    

    

    
    

    

    
    

    <details>
    <summary>Result</summary>

    

    </details>

2. In the POST request to `v2/files`, replace **@FILE_NAME.EXTENSION** with the uploaded file name and its extension.
You must include the ampersand (`@`) in the request to instruct curl to upload the contents of the file, not the string `FILE_NAME.EXTENSION`.

    
    

    

    
    

    

    
    

    

    
    

    The file is uploaded in the format `USER_ID/FILE_ID.FILE_EXTENSION`, and the API returns metadata about the uploaded file:

    ```json
    {
      "id":"d44dc2e1-9ae9-4cf6-9114-8d34a6126c94",
      "name":"engine_manual",
      "path":"07e5b864-e367-4f52-b647-a48035ae7e5e/d44dc2e1-9ae9-4cf6-9114-8d34a6126c94.pdf",
      "size":851160,
      "provider":null
    }
    ```

### Send files to your flows (v2)

:::info
The `/v2/files` endpoint can't send image files to flows.
To send image files to your flows through the API, see [Upload image files (v1)](#upload-image-files-v1).
:::

This endpoint uploads files to your Langflow server's file management system.
To use an uploaded file in a flow, send the file path to a flow with a [**Read File** component](/read-file).

The default file limit is 1024 MB. To configure this value, change the `LANGFLOW_MAX_FILE_SIZE_UPLOAD` [environment variable](/environment-variables).

1. To send a file to your flow with the API, POST the file to the `/api/v2/files` endpoint.

    Replace **FILE_NAME.EXTENSION** with the name and extension of the file you want to upload.
    This is the same step described in [Upload file (v2)](#upload-file-v2), but since you need the filename to upload to your flow, it is included here.

    
    

    

    
    

    

    
    

    

    
    

    The file is uploaded in the format `USER_ID/FILE_ID.FILE_EXTENSION`, and the API returns metadata about the uploaded file:

    ```json
    {
      "id":"d44dc2e1-9ae9-4cf6-9114-8d34a6126c94",
      "name":"engine_manual",
      "path":"07e5b864-e367-4f52-b647-a48035ae7e5e/d44dc2e1-9ae9-4cf6-9114-8d34a6126c94.pdf",
      "size":851160,
      "provider": null
    }
    ```

2. To use this file in your flow, add a **Read File** component to your flow.
This component loads files into flows from your local machine or Langflow file management.

3. Run the flow, passing the `path` to the `Read-File` component in the `tweaks` object:

    
    

    

    
    

    

    
    

    

    
    

    To get the `Read-File` component's ID, call the [Read flow](/api-flows#read-flow) endpoint or inspect the component in the visual editor.

    If the file path is valid, the flow runs successfully.

### List files (v2)

List all files associated with your user account.



















<details>
<summary>Result</summary>



</details>

### Download file (v2)

Download a specific file by its ID and file extension.

You must specify the file type you expect in the `--output` value.



















<details>
<summary>Result</summary>



</details>

### Edit file name (v2)

Change a file name.



















<details>
<summary>Result</summary>



</details>

### Delete file (v2)

Delete a specific file by its ID.



















<details>
<summary>Result</summary>



</details>

### Delete all files (v2)

Delete all files associated with your user account.



















<details>
<summary>Result</summary>



</details>

## Create upload file (Deprecated)

This endpoint is deprecated. Use the `/files` endpoints instead.

## See also

* [Manage files](/concepts-file-management)


---

# Document: api-flows-run

_Source: 

---
title: Flow trigger endpoints
slug: /api-flows-run
---





Use the `/run` and `/webhook` endpoints to run flows.

To create, read, update, and delete flows, see [Flow management endpoints](/api-flows).

## Run flow

:::tip
Langflow automatically generates Python, JavaScript, and curl code snippets for the `/v1/run/$FLOW_ID` endpoint for all flows.
For more information, see [Generate API code snippets](/concepts-publish#generate-api-code-snippets).
:::

Execute a specified flow by ID or name.
Flow IDs can be found on the code snippets on the [**API access** pane](/concepts-publish#api-access) or in a flow's URL.

The following example runs the **Basic Prompting** template flow with flow parameters passed in the request body.
This flow requires a chat input string (`input_value`), and uses default values for all other parameters.



















The response from `/v1/run/$FLOW_ID` includes metadata, inputs, and outputs for the run.

<details>
<summary>Result</summary>

The following example illustrates a response from a Basic Prompting flow:

```json
{
  "session_id": "chat-123",
  "outputs": [{
    "inputs": {
      "input_value": "Tell me about something interesting!"
    },
    "outputs": [{
      "results": {
        "message": {
          "text": "Sure! Have you ever heard of the phenomenon known as \"bioluminescence\"? It's a fascinating natural occurrence where living organisms produce and emit light. This ability is found in various species, including certain types of jellyfish, fireflies, and deep-sea creatures like anglerfish.\n\nBioluminescence occurs through a chemical reaction in which a light-emitting molecule called luciferin reacts with oxygen, catalyzed by an enzyme called luciferase. The result is a beautiful glow that can serve various purposes, such as attracting mates, deterring predators, or luring prey.\n\nOne of the most stunning displays of bioluminescence can be seen in the ocean, where certain plankton emit light when disturbed, creating a mesmerizing blue glow in the water. This phenomenon is often referred to as \"sea sparkle\" and can be seen in coastal areas around the world.\n\nBioluminescence not only captivates our imagination but also has practical applications in science and medicine, including the development of biosensors and imaging techniques. It's a remarkable example of nature's creativity and complexity!",
          "sender": "Machine",
          "sender_name": "AI",
          "session_id": "chat-123",
          "timestamp": "2025-03-03T17:17:37+00:00",
          "flow_id": "d2bbd92b-187e-4c84-b2d4-5df365704201",
          "properties": {
            "source": {
              "id": "OpenAIModel-d1wOZ",
              "display_name": "OpenAI",
              "source": "gpt-4o-mini"
            },
            "icon": "OpenAI"
          },
          "component_id": "ChatOutput-ylMzN"
        }
      }
    }]
  }]
}
```
</details>

If you are parsing the response in an application, you most likely need to extract the relevant content from the response, rather than pass the entire response back to the user.
For an example of a script that extracts data from a Langflow API response, see the [Quickstart](/get-started-quickstart).

### Stream LLM token responses

With `/v1/run/$FLOW_ID`, the flow is executed as a batch with optional LLM token response streaming.

To stream LLM token responses, append the `?stream=true` query parameter to the request:



















LLM chat responses are streamed back as `token` events, culminating in a final `end` event that closes the connection.

<details>
<summary>Result</summary>

The following example is truncated to illustrate a series of `token` events as well as the final `end` event that closes the LLM's token streaming response:

```text
{"event": "add_message", "data": {"timestamp": "2025-03-03T17:20:18", "sender": "User", "sender_name": "User", "session_id": "chat-123", "text": "Tell me about something interesting!", "files": [], "error": false, "edit": false, "properties": {"text_color": "", "background_color": "", "edited": false, "source": {"id": null, "display_name": null, "source": null}, "icon": "", "allow_markdown": false, "positive_feedback": null, "state": "complete", "targets": []}, "category": "message", "content_blocks": [], "id": "0103a21b-ebf7-4c02-9d72-017fb297f812", "flow_id": "d2bbd92b-187e-4c84-b2d4-5df365704201"}}

{"event": "add_message", "data": {"timestamp": "2025-03-03T17:20:18", "sender": "Machine", "sender_name": "AI", "session_id": "chat-123", "text": "", "files": [], "error": false, "edit": false, "properties": {"text_color": "", "background_color": "", "edited": false, "source": {"id": "OpenAIModel-d1wOZ", "display_name": "OpenAI", "source": "gpt-4o-mini"}, "icon": "OpenAI", "allow_markdown": false, "positive_feedback": null, "state": "complete", "targets": []}, "category": "message", "content_blocks": [], "id": "27b66789-e673-4c65-9e81-021752925161", "flow_id": "d2bbd92b-187e-4c84-b2d4-5df365704201"}}

{"event": "token", "data": {"chunk": " Have", "id": "27b66789-e673-4c65-9e81-021752925161", "timestamp": "2025-03-03 17:20:18 UTC"}}

{"event": "token", "data": {"chunk": " you", "id": "27b66789-e673-4c65-9e81-021752925161", "timestamp": "2025-03-03 17:20:18 UTC"}}

{"event": "token", "data": {"chunk": " ever", "id": "27b66789-e673-4c65-9e81-021752925161", "timestamp": "2025-03-03 17:20:18 UTC"}}

{"event": "token", "data": {"chunk": " heard", "id": "27b66789-e673-4c65-9e81-021752925161", "timestamp": "2025-03-03 17:20:18 UTC"}}

{"event": "token", "data": {"chunk": " of", "id": "27b66789-e673-4c65-9e81-021752925161", "timestamp": "2025-03-03 17:20:18 UTC"}}

{"event": "token", "data": {"chunk": " the", "id": "27b66789-e673-4c65-9e81-021752925161", "timestamp": "2025-03-03 17:20:18 UTC"}}

{"event": "token", "data": {"chunk": " phenomenon", "id": "27b66789-e673-4c65-9e81-021752925161", "timestamp": "2025-03-03 17:20:18 UTC"}}

{"event": "end", "data": {"result": {"session_id": "chat-123", "message": "Sure! Have you ever heard of the phenomenon known as \"bioluminescence\"?..."}}}
```

</details>

### Run endpoint headers

| Header | Info | Example |
|--------|------|---------|
| Content-Type | Required. Specifies the JSON format. | "application/json" |
| accept | Optional. Specifies the response format. Defaults to JSON if not specified. | "application/json" |
| x-api-key | Required. Your Langflow API key for authentication. Can be passed as a header or query parameter. | "sk-..." |
| `X-LANGFLOW-GLOBAL-VAR-*` | Optional. Pass global variables to the flow. Variable names are automatically converted to uppercase. These variables take precedence over OS environment variables and are only available during this specific request execution. | `"X-LANGFLOW-GLOBAL-VAR-API_KEY: sk-..."` |

### Run endpoint parameters

| Parameter | Type | Info |
|-----------|------|------|
| flow_id | UUID/string | Required. Part of URL: `/run/$FLOW_ID` |
| stream | Boolean | Optional. Query parameter: `/run/$FLOW_ID?stream=true` |
| input_value | string | Optional. JSON body field. Main input text/prompt. Default: `null` |
| input_type | string | Optional. JSON body field. Input type ("chat" or "text"). Default: `"chat"` |
| output_type | string | Optional. JSON body field. Output type ("chat", "any", "debug"). Default: `"chat"` |
| output_component | string | Optional. JSON body field. Target component for output. Default: `""` |
| tweaks | object | Optional. JSON body field. Component adjustments. Default: `null` |
| session_id | string | Optional. JSON body field. Conversation context ID. See [Session ID](/session-id). Default: `null` |

### Request example with all headers and parameters



















### Pass global variables in request headers {#pass-global-variables-in-headers}

You can pass global variables to your flow using HTTP headers with the format `X-LANGFLOW-GLOBAL-VAR-{VARIABLE_NAME}`.

Variables passed in headers take precedence over OS environment variables. If a variable is provided in both a header and an environment variable, the header value is used. Variables are only available during this specific request execution and aren't persisted.

Variable names are automatically converted to uppercase. For example, `X-LANGFLOW-GLOBAL-VAR-api-key` becomes `API_KEY` in your flow.

You don't need to create these variables in Langflow's Global Variables section first. Pass any variable name using this header format.



















If your flow components reference variables that aren't provided in headers or your Langflow database, the flow fails by default. To avoid this, you can set `LANGFLOW_FALLBACK_TO_ENV_VAR=True` in your `.env` file, which allows the flow to use values from OS environment variables if they aren't otherwise specified.


## Webhook run flow

Use the `/webhook` endpoint to start a flow by sending an HTTP `POST` request.

:::tip
After you add a [**Webhook** component](/webhook) to a flow, open the [**API access** pane](/concepts-publish), and then click the **Webhook curl** tab to get an automatically generated `POST /webhook` request for your flow.
For more information, see [Trigger flows with webhooks](/webhook).
:::



















<details>
<summary>Result</summary>



</details>

## Deprecated flow trigger endpoints

The following endpoints are deprecated and replaced by the `/run` endpoint:

* `/process`
* `/predict`


---

# Document: api-flows

_Source: 

---
title: Flow management endpoints
slug: /api-flows
---



Use the `/flows` endpoint to create, read, update, and delete flows.

If you want to use the Langflow API to run a flow, see [Flow trigger endpoints](/api-flows-run).

## Create flow

Creates a new flow.



















<details>
<summary>Result</summary>



</details>

## Create flows

Creates multiple new flows, returning an array of flow objects.



















## Read flow

Retrieves a specific flow by its ID.



















<details>
<summary>Result</summary>



</details>

## Read flows

Returns a JSON object containing a list of flows.

Retrieve all flows with pagination:



















To retrieve flows from a specific project, use the `project_id` query parameter:



















## Read sample flows

Retrieves a list of sample flows:



















## Update flow

Updates an existing flow by its ID.

This example changes the value for `endpoint_name` from a random UUID to `my_new_endpoint_name`.



















<details>
<summary>Result</summary>



</details>

## Delete flow

Deletes a specific flow by its ID.



















<details>
<summary>Result</summary>



</details>

## Export flows

Exports specified flows to a ZIP file.

This endpoint downloads a ZIP file containing [Langflow JSON files](/concepts-flows-import#langflow-json-file-contents) for each flow ID listed in the request body.



















<details>
<summary>Result</summary>



</details>

## Import flows

Imports flows by uploading a [Langflow-compatible JSON file](/concepts-flows-import#langflow-json-file-contents).

To specify a target project for the flow, include the query parameter `folder_id`.
The target `folder_id` must already exist before uploading a flow. Call the [/api/v1/projects/](/api-projects#read-projects) endpoint for a list of available folders and projects.

This example uploads a local file named `agent-with-astra-db-tool.json` to a folder specified by a `FOLDER_ID` variable:



















<details>
<summary>Result</summary>

```json
[
  {
    "name": "agent-with-astra-db-tool",
    "description": "",
    "icon": null,
    "icon_bg_color": null,
    "gradient": null,
    "data": {}
  ...
  }
]
```
</details>


---

# Document: api-logs

_Source: 

---
title: Logs endpoints
slug: /api-logs
---



Retrieve logs for your Langflow flows and server.

## Enable log retrieval

The `/logs` endpoint requires log retrieval to be enabled in your Langflow instance.

To enable log retrieval, set the following [environment variables](/environment-variables) in your Langflow `.env` file, and then start Langflow with `uv run langflow run --env-file .env`:

```text
LANGFLOW_ENABLE_LOG_RETRIEVAL=True
LANGFLOW_LOG_RETRIEVER_BUFFER_SIZE=10000 // Must be greater than 0
LANGFLOW_LOG_LEVEL=DEBUG // Can be DEBUG, ERROR, INFO, WARNING, or CRITICAL
```

## Stream logs

Stream logs in real-time using Server Sent Events (SSE):



















<details>
<summary>Result</summary>



</details>

## Retrieve logs with optional parameters

Retrieve logs with optional query parameters:

- `lines_before`: The number of logs before the timestamp or the last log.
- `lines_after`: The number of logs after the timestamp.
- `timestamp`: The timestamp to start getting logs from.

The default values for all three parameters is `0`.
With default values, the endpoint returns the last 10 lines of logs.



















<details>
<summary>Result</summary>



</details>


---

# Document: api-monitor

_Source: 

---
title: Monitor endpoints
slug: /api-monitor
---





The `/monitor` endpoints are for internal Langflow functionality, primarily related to running flows in the **Playground**, storing chat history, and generating flow logs.

This information is primarily for those who are building custom components or contributing to the Langflow codebase in a way that requires calling or understanding these endpoints.

For typical application development with Langflow, there are more appropriate options for monitoring, debugging, and memory management.
For more information, see the following:

* [Logs](/logging): Langflow log storage locations, customization options, and where to view logs in the visual editor
* [Test flows in the Playground](/concepts-playground): Run flows and inspect message history
* [Memory management options](/memory): Langflow storage locations and options, including the database, cache, and chat history

## Vertex builds

The Vertex build endpoints (`/monitor/builds`) are exclusively for **Playground** functionality.

When you run a flow in the **Playground**, Langflow calls the `/build/$FLOW_ID/flow` endpoint in [chat.py](https://github.com/langflow-ai/langflow/blob/main/src/backend/base/langflow/api/v1/chat.py#L130). This call retrieves the flow data, builds a graph, and executes the graph. As each component (or node) is executed, the `build_vertex` function calls `build_and_run`, which may call the individual components' `def_build` method, if it exists. If a component doesn't have a `def_build` function, the build still returns a component.

The `build` function allows components to execute logic at runtime. For example, the [**Recursive Character Text Splitter** component](https://github.com/langflow-ai/langflow/blob/main/src/lfx/src/lfx/components/langchain_utilities/recursive_character.py) is a child of the `LCTextSplitterComponent` class. When text needs to be processed, the parent class's `build` method is called, which creates a `RecursiveCharacterTextSplitter` object and uses it to split the text according to the defined parameters. The split text is then passed on to the next component. This all occurs when the component is built.

### Get Vertex builds

Retrieve Vertex builds for a specific flow.



















<details>
<summary>Result</summary>



</details>

### Delete Vertex builds

Delete Vertex builds for a specific flow.



















<details>
<summary>Result</summary>



</details>

## Messages endpoints

The `/monitor/messages` endpoints store, retrieve, edit, and delete records in the message table in [`langflow.db`](/memory)
Typically, these are called implicitly when running flows that produce message history, or when inspecting and modifying **Playground** memories.

### Get messages

Retrieve a list of all messages:



















To filter messages, use the `flow_id`, `session_id`, `sender`, and `sender_name` query parameters.

To sort the results, use the `order_by` query parameter.

This example retrieves messages sent by `Machine` and `AI` in a given chat session (`session_id`) and orders the messages by timestamp.



















<details>
<summary>Result</summary>



</details>

### Delete messages

Delete specific messages by their IDs.

This example deletes the message retrieved in the previous `GET /messages` example.



















<details>
<summary>Result</summary>



</details>

### Update message

Update a specific message by its ID.

This example updates the `text` value of message `3ab66cc6-c048-48f8-ab07-570f5af7b160`.



















<details>
<summary>Result</summary>



</details>

### Update session ID

Update the session ID for messages.

This example updates the `session_ID` value `01ce083d-748b-4b8d-97b6-33adbb6a528a` to `different_session_id`.



















<details>
<summary>Result</summary>



</details>

### Delete messages by session

Delete all messages for a specific session.



















<details>
<summary>Result</summary>



</details>

## Get traces

 Retrieve trace metadata and span trees for a specific flow.

### Example request

Use `GET /monitor/traces` and filter by `flow_id`:









```ts
const baseUrl = process.env.LANGFLOW_SERVER_URL ?? "http://localhost:7860";
const apiKey = process.env.LANGFLOW_API_KEY!;
const flowId = "YOUR_FLOW_ID";

async function listTraces() {
  const url = new URL("/api/v1/monitor/traces", baseUrl);
  url.searchParams.set("flow_id", flowId);
  url.searchParams.set("page", "1");
  url.searchParams.set("size", "50");

  const res = await fetch(url.toString(), {
    headers: {
      accept: "application/json",
      "x-api-key": apiKey,
    },
  });

  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }

  const data = await res.json();
  console.log(data);
}

listTraces().catch(console.error);
```









### Example response

```json
{
  "traces": [
    {
      "id": "426656db-fc3c-4a3a-acf8-c60acf099543",
      "name": "Simple Agent - 9e774f60-857b-44b4-bbcd-87bd23848ee8",
      "status": "ok",
      "startTime": "2026-03-03T19:13:30.692628Z",
      "totalLatencyMs": 18693,
      "totalTokens": 2050,
      "flowId": "9e774f60-857b-44b4-bbcd-87bd23848ee8",
      "sessionId": "9e774f60-857b-44b4-bbcd-87bd23848ee8",
      "input": {
        "input_value": "Use tools to teach me about vertex graphs"
      },
      "output": {
        "message": {
          "text_key": "text",
          "data": {
            "timestamp": "2026-03-03 19:13:30 UTC",
            "sender": "Machine",
            "sender_name": "AI",
            "session_id": "9e774f60-857b-44b4-bbcd-87bd23848ee8",
            "text": "I can teach you the concept, but I couldn’t pull the Wikipedia pages with the tool ... (truncated)"
          }
        }
      }
    }
  ],
  "total": 1,
  "pages": 1
}
```

## Get transactions

Retrieve all transactions, which are interactions between components, for a specific flow.
This information is also available in [flow logs](/logging).



















<details>
<summary>Result</summary>



</details>

## See also

- [Use voice mode](/concepts-voice-mode)
- [Session ID](/session-id)


---

# Document: api-openai-responses

_Source: 

---
title: OpenAI Responses API
slug: /api-openai-responses
---





Langflow includes an endpoint that is compatible with the [OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses).
It is available at `POST /api/v1/responses`.

This endpoint allows you to use existing OpenAI client libraries with minimal code changes.
You only need to replace the `model` name, such as `gpt-4`, with your `flow_id`.
You can find Flow IDs in the code snippets on the [**API access** pane](/concepts-publish#api-access) or in a flow's URL.

## Prerequisites

To be compatible with Langflow's OpenAI Responses API endpoint, your flow and request must adhere to the following requirements:

- **Chat Input**: Your flow must contain a **Chat Input** component.
Flows without this component return an error when passed to this endpoint.
The component types `ChatInput` and `Chat Input` are recognized as chat inputs.
- **Tools**: The `tools` parameter isn't supported, and returns an error if provided.
- **Model Names**: In your request, the `model` field must contain a valid flow ID or endpoint name.
- **Authentication**: All requests require an API key passed in the `x-api-key` header.
For more information, see [API keys and authentication](/api-keys-and-authentication).

### Additional configuration for OpenAI client libraries

This endpoint is compatible with OpenAI's API, but requires special configuration when using OpenAI client libraries.
Langflow uses `x-api-key` headers for authentication, while OpenAI uses `Authorization: Bearer` headers.
When sending requests to Langflow with OpenAI client libraries, you must configure custom headers and include an `api_key` configuration.
The `api_key` parameter can have any value, such as `"dummy-api-key"` in the client examples, as the actual authentication is handled through the `default_headers` configuration.

In the following examples, replace the values for `LANGFLOW_SERVER_URL`, `LANGFLOW_API_KEY`, and `FLOW_ID` with values from your deployment.













<details closed>
<summary>Response</summary>
```text
Here are the event dates for the second Wednesday of each month in 2026:
- January 14, 2026
- February 11, 2026
- March 11, 2026
- April 8, 2026
- May 13, 2026
- June 10, 2026
- July 8, 2026
- August 12, 2026
- September 9, 2026
- October 14, 2026
- November 11, 2026
- December 9, 2026
If you need these in a different format or want a downloadable calendar, let me know!
```
</details>

## Example request



















### Headers

| Header | Required | Description | Example |
|--------|----------|-------------|---------|
| `x-api-key` | Yes | Your Langflow API key for authentication | `"sk-..."` |
| `Content-Type` | Yes | Specifies the JSON format | `"application/json"` |
| `X-LANGFLOW-GLOBAL-VAR-*` | No | Global variables for the flow | `"X-LANGFLOW-GLOBAL-VAR-API_KEY: sk-..."` For more, see [Pass global variables to your flows in headers](#global-var). |

### Request body

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `model` | `string` | Yes | - | The flow ID or endpoint name to execute. |
| `input` | `string` | Yes | - | The input text to process. |
| `stream` | `boolean` | No | `false` | Whether to stream the response. |
| `background` | `boolean` | No | `false` | Whether to process in background. |
| `tools` | `list[Any]` | No | `null` | Tools are not supported yet. |
| `previous_response_id` | `string` | No | `null` | ID of previous response to continue conversation. For more, see [Continue conversations with response and session IDs](#response-id). |
| `include` | `list[string]` | No | `null` | Additional response data to include, such as `['tool_call.results']`. For more, see [Retrieve tool call results](#tool-call-results). |

## Example response

```json
{
  "id": "e5e8ef8a-7efd-4090-a110-6aca082bceb7",
  "object": "response",
  "created_at": 1756837941,
  "status": "completed",
  "model": "ced2ec91-f325-4bf0-8754-f3198c2b1563",
  "output": [
    {
      "type": "message",
      "id": "msg_e5e8ef8a-7efd-4090-a110-6aca082bceb7",
      "status": "completed",
      "role": "assistant",
      "content": [
        {
          "type": "output_text",
          "text": "Hello! I'm here and ready to help. How can I assist you today?",
          "annotations": []
        }
      ]
    }
  ],
  "parallel_tool_calls": true,
  "previous_response_id": null,
  "reasoning": {"effort": null, "summary": null},
  "store": true,
  "temperature": 1.0,
  "text": {"format": {"type": "text"}},
  "tool_choice": "auto",
  "tools": [],
  "top_p": 1.0,
  "truncation": "disabled",
  "usage": null,
  "user": null,
  "metadata": {}
}
```

### Response body

The response contains fields that Langflow sets dynamically and fields that use OpenAI-compatible defaults.

The OpenAI-compatible default values shown above are currently fixed and cannot be modified via the request.
They are included to maintain API compatibility and provide a consistent response format.

For your requests, you will only be setting the dynamic fields.
The default values are documented here for completeness and to show the full response structure.

Fields set dynamically by Langflow:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique response identifier. |
| `created_at` | `int` | Unix timestamp of response creation. |
| `model` | `string` | The flow ID that was executed. |
| `output` | `list[dict]` | Array of output items (messages, tool calls, etc.). |
| `previous_response_id` | `string` | ID of previous response if continuing conversation. |
| `usage` | `dict` | Token usage statistics if the `usage` field is available. Contains `prompt_tokens`, `completion_tokens`, and `total_tokens`. |

<details>
<summary>Fields with OpenAI-compatible default values</summary>

| Field | Type | Default Value | Description |
|-------|------|---------------|-------------|
| `object` | `string` | `"response"` | Always `"response"`. |
| `status` | `string` | `"completed"` | Response status: `"completed"`, `"in_progress"`, or `"failed"`. |
| `error` | `dict` | `null` | Error details (if any). |
| `incomplete_details` | `dict` | `null` | Incomplete response details (if any). |
| `instructions` | `string` | `null` | Response instructions (if any). |
| `max_output_tokens` | `int` | `null` | Maximum output tokens (if any). |
| `parallel_tool_calls` | `boolean` | `true` | Whether parallel tool calls are enabled. |
| `reasoning` | `dict` | `{"effort": null, "summary": null}` | Reasoning information with effort and summary. |
| `store` | `boolean` | `true` | Whether response is stored. |
| `temperature` | `float` | `1.0` | Temperature setting. |
| `text` | `dict` | `{"format": {"type": "text"}}` | Text format configuration. |
| `tool_choice` | `string` | `"auto"` | Tool choice setting. |
| `tools` | `list[dict]` | `[]` | Available tools. |
| `top_p` | `float` | `1.0` | Top-p setting. |
| `truncation` | `string` | `"disabled"` | Truncation setting. |
| `usage` | `dict` | `null` | Token usage statistics. Set dynamically when available from flow components, otherwise `null`. See [Token usage tracking](#token-usage-tracking). |
| `user` | `string` | `null` | User identifier (if any). |
| `metadata` | `dict` | `{}` | Additional metadata. |

</details>

## Example streaming request

When you set `"stream": true` with your request, the API returns a stream where each chunk contains a small piece of the response as it's generated. This provides a real-time experience where users can see the AI's output appear word by word, similar to ChatGPT's typing effect.



















<details>
<summary>Result</summary>



</details>

### Streaming response body

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique response identifier. |
| `object` | `string` | Always `"response.chunk"`. |
| `created` | `int` | Unix timestamp of chunk creation. |
| `model` | `string` | The flow ID that was executed. |
| `delta` | `dict` | The new content chunk. |
| `status` | `string` | Response status: `"completed"`, `"in_progress"`, or `"failed"` (optional). |

The stream continues until a final chunk with `"status": "completed"` indicates the response is finished.

<details>
<summary>Final completion chunk</summary>

```
{
  "id": "f7fcea36-f128-41c4-9ac1-e683137375d5",
  "object": "response.chunk",
  "created": 1756838094,
  "model": "ced2ec91-f325-4bf0-8754-f3198c2b1563",
  "delta": {},
  "status": "completed"
}
```
</details>

## Continue conversations with response and session IDs {#response-id}

Conversation continuity allows you to maintain context across multiple API calls, enabling multi-turn conversations with your flows. This is essential for building chat applications where users can have ongoing conversations.

When you make a request, the API returns a response with an `id` field. You can use this `id` as the `previous_response_id` in your next request to continue the conversation from where it left off.

First Message:



















<details>
<summary>Result</summary>



</details>

Follow-up message:



















<details>
<summary>Result</summary>



</details>

Optionally, you can use your own session ID values for the `previous_response_id`:



















<details>
<summary>Result</summary>

This example uses the same flow as the other `previous_response_id` examples, but the LLM had not yet been introduced to Alice in the specified session:

```json
{
  "id": "session-alice-1756839048",
  "object": "response",
  "created_at": 1756839048,
  "status": "completed",
  "model": "ced2ec91-f325-4bf0-8754-f3198c2b1563",
  "output": [
    {
      "type": "message",
      "id": "msg_session-alice-1756839048",
      "status": "completed",
      "role": "assistant",
      "content": [
        {
          "type": "output_text",
          "text": "I don't have access to your name unless you tell me. If you'd like, you can share your name, and I'll remember it for this conversation!",
          "annotations": []
        }
      ]
    }
  ],
  "previous_response_id": "session-alice-1756839048"
}
```

</details>

## Retrieve tool call results {#tool-call-results}

When you send a request to the `/api/v1/responses` endpoint to run a flow that includes tools or function calls, you can retrieve the raw tool execution details by adding `"include": ["tool_call.results"]` to the request payload.

Without the `include` parameter, tool calls return basic function call information, but not the raw tool results.
For example:

```json
{
  "id": "fc_1",
  "type": "function_call",
  "status": "completed",
  "name": "evaluate_expression",
  "arguments": "{\"expression\": \"15*23\"}"
},
```

To get the raw `results` of each tool execution, add  `include: ["tool_call.results"]` to the request payload:



















The response now includes the tool call's results.
For example:

```json
{
  "id": "evaluate_expression_1",
  "type": "tool_call",
  "tool_name": "evaluate_expression",
  "queries": ["15*23"],
  "results": {"result": "345"}
}
```

<details>
<summary>Result</summary>



</details>

Variables passed with `X-LANGFLOW-GLOBAL-VAR-{VARIABLE_NAME}` are always available to your flow, regardless of whether they exist in the database.

If your flow components reference variables that aren't provided in headers or your Langflow database, the flow fails by default.

To avoid this, you can set the `FALLBACK_TO_ENV_VARS` environment variable is `true`, which allows the flow to use values from the `.env` file if they aren't otherwise specified.

In the above example, `OPENAI_API_KEY` will fall back to the database variable if not provided in the header.
`USER_ID` and `ENVIRONMENT` will fall back to environment variables if `FALLBACK_TO_ENV_VARS` is enabled.
Otherwise, the flow fails.

## Token usage tracking {#token-usage-tracking}

The OpenAI Responses API endpoint tracks token usage when your flow uses language model components that provide token usage information. The `usage` field in the response contains statistics about the number of tokens used for the request and response.

Token usage is automatically extracted from the flow execution results when the `usage` field is available.
The `usage` field follows OpenAI's format with `prompt_tokens`, `completion_tokens`, and `total_tokens` fields.
If token usage information is not available from the flow components, the `usage` field is `null`.

The `usage` field is always present in the response, either with token counts or as `null`. The conditional checks shown in the examples below are optional defensive programming to handle cases where usage might not be available.
















<details>
<summary>Response with token usage</summary>

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "object": "response",
  "created_at": 1756837941,
  "status": "completed",
  "model": "ced2ec91-f325-4bf0-8754-f3198c2b1563",
  "output": [
    {
      "type": "message",
      "id": "msg_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "status": "completed",
      "role": "assistant",
      "content": [
        {
          "type": "output_text",
          "text": "Quantum computing is a type of computing that uses quantum mechanical phenomena...",
          "annotations": []
        }
      ]
    }
  ],
  "usage": {
    "prompt_tokens": 12,
    "completion_tokens": 145,
    "total_tokens": 157
  },
  "previous_response_id": null
}
```

</details>





---

# Document: api-projects

_Source: 

---
title: Projects endpoints
slug: /api-projects
---



Use the `/projects` endpoint to create, read, update, and delete [Langflow projects](/concepts-flows#projects).

## Read projects

Get a list of Langflow projects, including project IDs, names, and descriptions.



















<details>
<summary>Result</summary>



</details>

## Create project

Create a new project.



















<details>
<summary>Result</summary>



</details>

To add flows and components at project creation, retrieve the `components_list` and `flows_list` values from the [`/all`](/api-reference-api-examples#get-all-components) and [/flows/read](/api-flows#read-flows) endpoints and add them to the request body.

Adding a flow to a project moves the flow from its previous location. The flow isn't copied.



















## Read project

Retrieve details of a specific project.

To find the UUID of your project, call the [read projects](#read-projects) endpoint.



















<details>
<summary>Result</summary>



</details>

## Update project

Update the information of a specific project with a `PATCH` request.

Each PATCH request updates the project with the values you send.
Only the fields you include in your request are updated.
If you send the same values multiple times, the update is still processed, even if the values are unchanged.



















<details>
<summary>Result</summary>



</details>

## Delete project

Delete a specific project.



















<details>
<summary>Result</summary>



</details>

## Export a project

Download all flows from a project as a zip file.

The `--output` flag is optional.



















## Import a project

Import a project and its flows by uploading a Langflow project zip file:




















---

# Document: api-reference-api-examples

_Source: 

---
title: Get started with the Langflow API
slug: /api-reference-api-examples
---




You can use the Langflow API for programmatic interactions with Langflow, such as the following:

* Create and edit flows, including file management for flows.
* Develop applications that use your flows.
* Develop custom components.
* Build Langflow as a dependency of a larger application, codebase, or service.
* Contribute to the overall Langflow codebase.

To view and test all available endpoints, you can access the Langflow API's OpenAPI specification at your Langflow deployment's `/docs` endpoint, such as `http://localhost:7860/docs`.

:::tip Try it
For an example of the Langflow API in a script, see the [Langflow quickstart](/get-started-quickstart).

The quickstart demonstrates how to get automatically generated code snippets for your flows, use a script to run a flow, and extract data from the Langfow API response.
:::

## Form Langflow API requests

While individual options vary by endpoint, all Langflow API requests share some commonalities, like a URL, method, parameters, and authentication.

As an example of a Langflow API request, the following curl command calls the `/v1/run` endpoint, and it passes a runtime override (`tweaks`) to the flow's **Chat Output** component:



















### Base URL

By default, local deployments serve the Langflow API at `http://localhost:7860/api`.

Remotely hosted Langflow deployments are available at the domain set by the hosting service, such as `http://IP_OR_DNS/api` or `http://IP_OR_DNS:LANGFLOW_PORT/api`.

You can configure the Langflow port number in the `LANGFLOW_PORT` [environment variable](/environment-variables).

* `https://UUID.ngrok.app/api`
* `http://IP_OR_DNS/api`
* `http://IP_OR_DNS:LANGFLOW_PORT/api`

### Authentication

In Langflow versions 1.5 and later, most API endpoints require authentication with a Langflow API key in either an `x-api-key` header or query parameter.
For more information, see [API keys and authentication](/api-keys-and-authentication).

As with any API, follow industry best practices for storing and referencing sensitive credentials.
For example, you can [set environment variables](#set-environment-variables) for your API keys, and then reference those environment variables in your API requests.

### Methods, paths, and parameters

Langflow API requests use various methods, paths, path parameters, query parameters, and body parameters.
The specific requirements and options depend on the endpoint that you want to call.

For example, to create a flow, you pass a JSON-formatted flow definition to `POST /v1/flows`.
Then, to run your flow, you call `POST /v1/run/$FLOW_ID` with optional run parameters in the request body.

### API versions

The Langflow API serves `/v1` and `/v2` endpoints.

Some endpoints only exist under a single version and some exist under both the `/v1` and `/v2` versions.

If a request fails or has an unexpected result, make sure your endpoint path has the correct version.

## Set environment variables

You can store commonly used values in environment variables to facilitate reuse, simplify token rotation, and securely reference sensitive values.

You can use any method you prefer to set environment variables, such as `export`, `.env`, `zshrc`, or `.curlrc`.
Then, reference those environment variables in your API requests.
For example:



Commonly used values in Langflow API requests include your [Langflow server URL](#base-url), [Langflow API keys](#authentication), flow IDs, and [project IDs](/api-projects#read-projects).

You can retrieve flow IDs from the [**API access** pane](/concepts-publish#api-access), in a flow's URL, and with [`GET /flows`](/api-flows#read-flows).

## Try some Langflow API requests

Once you have your Langflow server URL, try calling these endpoints that return Langflow metadata.

### Health check

Returns the health status of the Langflow database and chat services:



















<details>
<summary>Result</summary>



</details>

Langflow provides an additional `GET /health` endpoint.
This endpoint is served by uvicorn before Langflow is fully initialized, so it's not reliable for checking Langflow service health.

### Get version

Returns the current Langflow API version:



















<details>
<summary>Result</summary>



</details>

### Get configuration

Returns configuration details for your Langflow deployment.
Requires a [Langflow API key](/api-keys-and-authentication).



















<details>
<summary>Result</summary>



</details>

### Get all components

Returns a dictionary of all Langflow components.
Requires a [Langflow API key](/api-keys-and-authentication).



















## Available endpoints

Because you can run Langflow as either an IDE (frontend and backend) or a runtime (headless, backend-only), it serves endpoints that support frontend and backend operations.
Many endpoints are for orchestration between the frontend and backend, reading and writing to the Langflow database, or enabling frontend functionality, like the **Playground**.
Unless you are contributing to the Langflow codebase, you won't directly call most of the Langflow endpoints.

For application development, the most commonly used endpoints are the `/run` and `/webhook` [flow trigger endpoints](/api-flows-run).
For some use cases, you might use some other endpoints, such as the `/files` endpoints to use files in flows.

To help you explore the available endpoints, the following lists are sorted by primary use case, although some endpoints might support multiple use cases.




The following endpoints are useful for developing applications with Langflow and administering Langflow deployments with one or more users.
You will most often use the flow trigger endpoints.
Other endpoints are helpful for specific use cases, such as administration and flow management in runtime deployments that don't have a visual editor.

* [Flow trigger endpoints](/api-flows-run):
  * POST `/v1/run/{flow_id_or_name}`: Run a flow.
  * POST `/v1/run/advanced/{flow_id}`: Advanced run with explicit `inputs`, `outputs`, `tweaks`, and optional `session_id`.
  * POST `/v1/webhook/{flow_id_or_name}`: Trigger a flow via webhook payload.

* [OpenAI Responses API](/api-openai-responses):
  * POST `/v1/responses`: Execute flows using an OpenAI-compatible request format.

* Deployment details:
  * GET `/v1/version`: Return Langflow version. See [Get version](/api-reference-api-examples#get-version).
  * GET `/v1/config`: Return deployment configuration. See [Get configuration](/api-reference-api-examples#get-configuration).
  * GET `/health_check`: Health check endpoint that validates database and chat service connectivity. Returns 500 status if any service is unavailable.

* [Projects endpoints](/api-projects):
  * POST `/v1/projects/`: Create a project.
  * GET `/v1/projects/`: List projects.
  * GET `/v1/projects/{project_id}`: Read a project (with paginated flows support).
  * PATCH `/v1/projects/{project_id}`: Update project info and membership.
  * DELETE `/v1/projects/{project_id}`: Delete a project.
  * GET `/v1/projects/download/{project_id}`: Export all flows in a project as ZIP.
  * POST `/v1/projects/upload/`: Import a project ZIP (creates project and flows).
  * GET `/v1/starter-projects/`: Return a list of templates.

* [Files endpoints](/api-files):
  * Files (v1)
    * POST `/v1/files/upload/{flow_id}`: Upload a file to a specific flow.
    * GET `/v1/files/download/{flow_id}/{file_name}`: Download a file from a flow.
    * GET `/v1/files/images/{flow_id}/{file_name}`: Stream an image from a flow.
    * GET `/v1/files/profile_pictures/{folder_name}/{file_name}`: Get a profile picture asset.
    * GET `/v1/files/profile_pictures/list`: List available profile picture assets.
    * GET `/v1/files/list/{flow_id}`: List files for a flow.
    * DELETE `/v1/files/delete/{flow_id}/{file_name}`: Delete a file from a flow.
  * Files (v2)
    * POST `/v2/files` (alias `/v2/files/`): Upload a file owned by the current user.
    * GET `/v2/files` (alias `/v2/files/`): List files owned by the current user.
    * DELETE `/v2/files/batch/`: Delete multiple files by IDs.
    * POST `/v2/files/batch/`: Download multiple files as a ZIP by IDs.
    * GET `/v2/files/{file_id}`: Download a file by ID (or return raw content internally).
    * PUT `/v2/files/{file_id}`: Edit a file name by ID.
    * DELETE `/v2/files/{file_id}`: Delete a file by ID.
    * DELETE `/v2/files` (alias `/v2/files/`): Delete all files for the current user.

* [API keys and authentication](/api-keys-and-authentication):
  * GET `/v1/api_key/`: List API keys for the current user.
  * POST `/v1/api_key/`: Create a new API key.
  * DELETE `/v1/api_key/{api_key_id}`: Delete an API key.
  * POST `/v1/api_key/store`: Save an encrypted Store API key (cookie set).

* [Flow management endpoints](/api-flows):
  * POST `/v1/flows/`: Create a flow.
  * GET `/v1/flows/`: List flows (supports pagination and filters).
  * GET `/v1/flows/{flow_id}`: Read a flow by ID.
  * GET `/v1/flows/public_flow/{flow_id}`: Read a public flow by ID.
  * PATCH `/v1/flows/{flow_id}`: Update a flow.
  * DELETE `/v1/flows/{flow_id}`: Delete a flow.
  * POST `/v1/flows/batch/`: Create multiple flows.
  * POST `/v1/flows/upload/`: Import flows from a JSON file.
  * DELETE `/v1/flows/`: Delete multiple flows by IDs.
  * POST `/v1/flows/download/`: Export flows to a ZIP file.
  * GET `/v1/flows/basic_examples/`: List basic example flows.

* [Users endpoints](/api-users):
  * POST `/v1/users/`: Add a user (superuser required when auth enabled).
  * GET `/v1/users/whoami`: Return the current authenticated user.
  * GET `/v1/users/`: List all users (superuser required).
  * PATCH `/v1/users/{user_id}`: Update a user (with role checks).
  * PATCH `/v1/users/{user_id}/reset-password`: Reset own password.
  * DELETE `/v1/users/{user_id}`: Delete a user (cannot delete yourself).

* Custom components: You might use these endpoints when developing custom Langflow components for your own use or to share with the Langflow community:
  * GET `/v1/all`: Return all available Langflow component types. See [Get all components](/api-reference-api-examples#get-all-components).
  * POST `/v1/custom_component`: Build a custom component from code and return its node.
  * POST `/v1/custom_component/update`: Update an existing custom component's build config and outputs.
  * POST `/v1/validate/code`: Validate a Python code snippet for a custom component.
  * POST `/v1/validate/prompt`: Validate a prompt payload.




The following endpoints are most often used when contributing to the Langflow codebase, and you need to understand or call endpoints that support frontend-to-backend orchestration or other internal functionality.

* Base (metadata):
  * GET `/v1/all`: Return all available Langflow component types. See [Get all components](/api-reference-api-examples#get-all-components).
  * GET `/v1/version`: Return Langflow version. See [Get version](/api-reference-api-examples#get-version).
  * GET `/v1/config`: Return deployment configuration. See [Get configuration](/api-reference-api-examples#get-configuration).
  * GET `/v1/starter-projects/`: Return a list of templates.

* [Build endpoints](/api-build) (internal editor support):
  * POST `/v1/build/{flow_id}/flow`: Start a flow build and return a job ID.
  * GET `/v1/build/{job_id}/events`: Stream or fetch build events.
  * POST `/v1/build/{job_id}/cancel`: Cancel a build job.
  * POST `/v1/build_public_tmp/{flow_id}/flow`: Build a public flow without auth.
  * POST `/v1/validate/prompt`: Validate a prompt payload.

* [API keys and authentication](/api-keys-and-authentication):
  * POST `/v1/login`: Login and set tokens as cookies.
  * GET `/v1/auto_login`: Auto-login (if enabled) and set tokens.
  * POST `/v1/refresh`: Refresh tokens using refresh cookie.
  * POST `/v1/logout`: Logout and clear cookies.

* [Monitor endpoints](/api-monitor):
  * GET `/v1/monitor/builds`: Get vertex builds for a flow.
  * DELETE `/v1/monitor/builds`: Delete vertex builds for a flow.
  * GET `/v1/monitor/messages/sessions`: List message session IDs (auth required).
  * GET `/v1/monitor/messages`: List messages with optional filters.
  * DELETE `/v1/monitor/messages`: Delete messages by IDs (auth required).
  * PUT `/v1/monitor/messages/{message_id}`: Update a message.
  * PATCH `/v1/monitor/messages/session/{old_session_id}`: Change a session ID for all messages in that session.
  * DELETE `/v1/monitor/messages/session/{session_id}`: Delete messages by session.
  * GET `/v1/monitor/transactions`: List transactions for a flow (paginated).

* Variables:
  * POST `/v1/variables/`: Create a variable, such as an API key, for the user.
  * GET `/v1/variables/`: List variables for the user.
  * PATCH `/v1/variables/{variable_id}`: Update a variable.
  * DELETE `/v1/variables/{variable_id}`: Delete a variable.

* [Use voice mode](/concepts-voice-mode):
  * WS `/v1/voice/ws/flow_as_tool/{flow_id}`: Bi-directional voice session exposing the flow as a tool.
  * WS `/v1/voice/ws/flow_as_tool/{flow_id}/{session_id}`: Same as above with explicit session ID.
  * WS `/v1/voice/ws/flow_tts/{flow_id}`: Voice-to-text session that runs a flow and returns TTS.
  * WS `/v1/voice/ws/flow_tts/{flow_id}/{session_id}`: Same as above with explicit session ID.
  * GET `/v1/voice/elevenlabs/voice_ids`: List available ElevenLabs voice IDs for the user.

* MCP servers: The following endpoints are for managing Langflow MCP servers and MCP server connections.
They aren't typically called directly; instead, they are used to drive internal functionality in the Langflow frontend and when running flows that call MCP servers.
Langflow MCP servers support both streamable HTTP and SSE transport.
  * HEAD `/v1/mcp/streamable`: Health check for streamable HTTP MCP.
  * GET `/v1/mcp/streamable`: Open streamable HTTP connection for MCP server.
  * POST `/v1/mcp/streamable`: Post messages to the MCP server via streamable HTTP.
  * DELETE `/v1/mcp/streamable`: Close streamable HTTP connection.
  * HEAD `/v1/mcp/sse` (LEGACY): Health check for MCP SSE.
  * GET `/v1/mcp/sse` (LEGACY): Open SSE stream for MCP server events.
  * POST `/v1/mcp/` (LEGACY): Post messages to the MCP server.
  * GET `/v1/mcp/project/{project_id}`: List MCP-enabled tools and project auth settings.
  * HEAD `/v1/mcp/project/{project_id}/streamable`: Health check for project streamable HTTP MCP.
  * GET `/v1/mcp/project/{project_id}/streamable`: Open project-scoped streamable HTTP connection.
  * POST `/v1/mcp/project/{project_id}/streamable`: Post messages to project MCP server via streamable HTTP.
  * DELETE `/v1/mcp/project/{project_id}/streamable`: Close project streamable HTTP connection.
  * HEAD `/v1/mcp/project/{project_id}/sse` (LEGACY): Health check for project SSE.
  * GET `/v1/mcp/project/{project_id}/sse` (LEGACY): Open project-scoped MCP SSE.
  * POST `/v1/mcp/project/{project_id}` (LEGACY): Post messages to project MCP server.
  * PATCH `/v1/mcp/project/{project_id}`: Update MCP settings for flows and project auth settings.
  * POST `/v1/mcp/project/{project_id}/install`: Install MCP client config for Cursor/Windsurf/Claude (local only).
  * GET `/v1/mcp/project/{project_id}/installed`: Check which clients have MCP config installed.

* Custom components: You might use these endpoints when developing custom Langflow components for your own use or to share with the Langflow community:
  * GET `/v1/all`: Return all available Langflow component types. See [Get all components](/api-reference-api-examples#get-all-components).
  * POST `/v1/custom_component`: Build a custom component from code and return its node.
  * POST `/v1/custom_component/update`: Update an existing custom component's build config and outputs.
  * POST `/v1/validate/code`: Validate a Python code snippet for a custom component.
  * POST `/v1/validate/prompt`: Validate a prompt payload.




The following endpoints are deprecated:

* POST `/v1/predict/{flow_id}`: Use [`/v1/run/{flow_id}`](/api-flows-run) instead.
* POST `/v1/process/{flow_id}`: Use [`/v1/run/{flow_id}`](/api-flows-run) instead.
* GET `/v1/task/{task_id}`: Deprecated functionality.
* POST `/v1/upload/{flow_id}`: Use [`/files`](/api-files) instead.
* POST `/v1/build/{flow_id}/vertices`: Replaced by [`/monitor/builds`](/api-monitor).
* POST `/v1/build/{flow_id}/vertices/{vertex_id}`: Replaced by [`/monitor/builds`](/api-monitor).
* GET `/v1/build/{flow_id}/{vertex_id}/stream`: Replaced by [`/monitor/builds`](/api-monitor).
* GET `/v1/store/check/`: Return whether the Store feature is enabled.
* GET `/v1/store/check/api_key`: Check if a Store API key exists and is valid.
* POST `/v1/store/components/`: Share a component to the Store.
* PATCH `/v1/store/components/{component_id}`: Update a shared component.
* GET `/v1/store/components/`: List available Store components (filters supported).
* GET `/v1/store/components/{component_id}`: Download a component from the Store.
* GET `/v1/store/tags`: List Store tags.
* GET `/v1/store/users/likes`: List components liked by the current user.
* POST `/v1/store/users/likes/{component_id}`: Like a component.




## Next steps

* Use the Langflow API to [run a flow](/api-flows-run).
* Use the Langflow API to [upload files](/api-files).
* Use the Langflow API to [get flow logs](/api-logs).
* Explore all endpoints in the [Langflow API specification](/api).


---

# Document: api-users

_Source: 

---
title: Users endpoints
slug: /api-users
---



Use the `/users` endpoint to manage user accounts in Langflow.

## Add user

Create a new user account with a given username and password.

Requires authentication as a superuser if the Langflow server has authentication enabled.



















The request returns an object describing the new user.
The user's UUID is stored in `user_id` in the Langflow database, and returned as `id` in the `/users` API response.
This `user_id` key is specifically for Langflow user management.

<details>
<summary>Result</summary>



</details>

## Get current user

Retrieve information about the authenticated user.



















<details>
<summary>Result</summary>



</details>

## List all users

Get a paginated list of all users in the system.

Requires authentication as a superuser if the Langflow server has authentication enabled.



















<details>
<summary>Result</summary>



</details>

## Update user

Modify an existing user's information with a PATCH request.

Requires authentication as a superuser if the Langflow server has authentication enabled.

This example activates the specified user's account and makes them a superuser:



















<details>
<summary>Result</summary>



</details>

## Reset password

Change the specified user's password to a new secure value.

Requires authentication as the target user.



















<details>
<summary>Result</summary>



</details>

## Delete user

Remove a user account from the system.

Requires authentication as a superuser if the Langflow server has authentication enabled.



















<details>
<summary>Result</summary>



</details>


---

# Document: flow-devops-sdk

_Source: 

---
title: Flow DevOps Toolkit SDK
slug: /flow-devops-sdk
---

Use the Flow DevOps Toolkit SDK to version, test, and deploy your flows.

Instead of manually exporting, sharing, and importing flow JSON files from the Langflow UI, the Flow DevOps toolkit offers terminal-based workflows for versioning, environment variables, testing, and deployment.

## Prerequisites

- [Install and start Langflow](/get-started-installation)
- Create a [Langflow API key](/api-keys-and-authentication)
- Install the Langflow `lfx` package

   To install the `lfx` package from PyPI, do the following:

   1. Create a virtual environment:
      ```bash
      uv venv VENV_NAME
      ```

   2. Activate the virtual environment.
      ```bash
      source VENV_NAME/bin/activate
      ```
   3. Install the Langflow LFX package in the virtual environment:
      ```bash
      uv pip install lfx
      ```
   4. Run Flow DevOps Toolkit commands in the virtual environment that has LFX installed.

      Alternatively, you can run `uvx lfx` commands, or run LFX from the `src/lfx` directory in a cloned Langflow repo.
      For more information, see the [Langflow LFX README](https://github.com/langflow-ai/langflow/blob/main/src/lfx/README.md).

## Create a project and version a flow

1. Create a flow in the Langflow UI, such as the Simple Agent starter flow in the [Quickstart](/get-started-quickstart).
2. Open a terminal session within the virtual environment that has `lfx` installed.
3. To initialize a project, run:
    ```bash
    lfx init PROJECT_NAME
    ```

    Replace `PROJECT_NAME` with a name for your project folder.
    `lfx init` creates a scaffold for your project.
    The output is similar to the following:

    ```text
    demo-project/
    ├── .github/
    │   └── workflows/
    │       ├── langflow-push.yml       # CI workflow
    │       ├── langflow-test.yml       # CI workflow
    │       └── langflow-validate.yml   # CI workflow
    ├── .gitignore                      # ignores legacy credentials file
    ├── .lfx/
    │   └── environments.yaml           # edit with your instance URLs + API key env var names (safe to commit)
    ├── ci/
    │   ├── ci-push.sh                  # generic CI script
    │   ├── ci-test.sh                  # generic CI script
    │   └── ci-validate.sh              # generic CI script
    ├── flows/
    │   └── .gitkeep                    # versioned empty directory
    └── tests/
        ├── __init__.py
        └── test_flows.py               # flow_runner example tests

    ✔ Project scaffolded. Next steps:
      1. Edit `.lfx/environments.yaml` with your instance URL
      2. export LANGFLOW_LOCAL_API_KEY=<key>   (Settings -> API Keys)
      3. lfx pull --env local --output-dir flows/
    ```

    The project scaffold includes the following tools for building flows:

    * `.github/workflows`: GitHub CI tooling.
    * `.lfx/environments.yaml`: Control your project's URL and API keys as environment variables for local, staging, and production environments.
    * `ci/` Shell scripts for pushing, testing, and validating flows.
    * `flows/`: An empty directory to store flows that includes a `.gitkeep` file for flow versioning.
    * `tests/test_flows.py`: Example tests that you can modify to test flows.

4. Add your Langflow API key to your `.env` file, or export it within the terminal session.
    The Flow DevOps SDK includes `url` and `api_key_env` environment variables for `local`, `staging`, and `production` environments.
    The variable name for the API key differs between environments, so ensure you're adding the correct variable.
    For example, to add a Langflow API key to a local Langflow server, set:

    ```text
    export LANGFLOW_LOCAL_API_KEY=LANGFLOW_API_KEY
    ```

5. To test server authentication with your API key, run:

    ```bash
    lfx login
    ```

    The Flow DevOps SDK tests your key against the URL and confirms the connection is working.
    If the test reports `Authentication failed`, create and export a new key and try again.

6. To check the connected server for existing flows, run:

    ```bash
    lfx pull
    ```

    The Flow DevOps SDK lists your server's flows. Output is similar to the following (from a project directory such as `demo-project/`):

    ```text
    Pulling all flows from http://localhost:7860
    Pulled 'Simple Agent' -> flows/Simple_Agent.json

    ┌────────────────┬──────────────────────────────────────┬───────────────────────────┬──────────┐
    │ Name           │ ID                                   │ File                      │ Status   │
    ├────────────────┼──────────────────────────────────────┼───────────────────────────┼──────────┤
    │ Simple Agent   │ c2f91b01-9a73-4c62-b7f0-e15bc3bd6802 │ flows/Simple_Agent.json   │ CREATED  │
    └────────────────┴──────────────────────────────────────┴───────────────────────────┴──────────┘

    1 updated.
    ```

    `lfx pull` pulls flow changes on the server to JSON files under `flows/` in your project (for example `demo-project/flows`).
    If you run `lfx pull` again, the Flow DevOps SDK reports a Status of `Unchanged`.
    You will pull changes in the next steps.
7. In the Langflow UI, open the Simple Agent flow and change the flow.
    For example, change the **Chat Input** to a different input string.
    Save the flow.
8. Return to your terminal, and run `lfx status`.
   The Flow DevOps SDK reports the flow's Status as `UPDATED`, because the hash of the flow JSON has changed with your update.
9. To pull the reported changes from the Langflow server to your local project folder, run `lfx pull`.
10. To _push_ flow changes from flows stored locally in `demo-project/flows` to the Langflow server, run `lfx push`.

## Validate flows

The Flow DevOps SDK can validate that local flows are correctly formed before pushing to the Langflow with `lfx validate`.

1. To test the Simple Agent starter flow, pass the flow JSON path to the `lfx validate` command:
    ```
    lfx validate flows/Simple_Agent.json
    ```
2. Once validated, push flow changes to the server with `lfx push`.

## Generate requirements.txt for flows

The Flow DevOps SDK can generate a `requirements.txt` file for a flow.

A flow JSON describes nodes and wiring, and does not list the PyPI packages components import at runtime.
Generate a `requirements.txt` file to capture the minimal Python dependencies, so you can install a matching environment for the flow.

1. From your project directory, point `lfx requirements` at a flow JSON file.
   To print the requirements to the terminal:

   ```
   lfx requirements flows/Simple_Agent.json
   ```

   To write a `requirements.txt` file instead of printing, use `-o` or `--output`:

   ```
   lfx requirements flows/Simple_Agent.json -o requirements.txt
   ```

2. Optionally, you can now share and serve the flow by keeping the flow JSON and `requirements.txt` in the same environment.
   To serve the flow without the Langflow UI, do the following:

   1. Create a virtual environment:
   ```
   uv venv VENV_NAME
   ```

   2. Activate the virtual environment.
   ```
   source VENV_NAME/bin/activate
   ```

   3. Install the dependencies from `requirements.txt` in the virtual environment:
   ```bash
   uv pip install -r requirements.txt
   ```

   4. To set a Langflow API key, run:
   ```
   export LANGFLOW_API_KEY=LANGFLOW_API_KEY
   ```

   5. To serve the flow without the Langflow UI, pass the flow JSON path to the `lfx serve` command:
   ```
   lfx serve flows/Simple_Agent.json
   ```

   `lfx serve` starts a FastAPI app that exposes your flow as an HTTP API endpoint.
   For more information, see the [Langflow LFX README](https://github.com/langflow-ai/langflow/blob/main/src/lfx/README.md).

## Manage multiple environments with `environments.yaml`

The `environments.yaml` file created at initialization contains three example entries for deployment environments:

```yaml
local:
  url: http://127.0.0.1:7860
  api_key_env: LANGFLOW_LOCAL_API_KEY
staging:
  url: https://staging.example.com
  api_key_env: LANGFLOW_STAGING_API_KEY
production:
  url: https://langflow.example.com
  api_key_env: LANGFLOW_PRODUCTION_API_KEY
```

Each entry contains a `url` for the Langflow base URL, and an `api_key_env` field.
The `api_key_env` field names an environment variable that you either `export` or store in a `.env` file, and does not store the secret string itself, which makes `environments.yaml` safe to commit to version control.

The names `local`, `staging`, and `production` in `environments.yaml` are conventions, and can be named whatever your project requires. You can add more than three entries.

`environments.yaml` is distinct from the Langflow or LFX `.env` file.
`environments.yaml` controls which remote Langflow instance you're deploying flows to, flow versioning, and environment variable _names_ for API keys.
The `.env` contains runtime values for the Langflow server, and might also contain _actual secret values_, so the `.env` should not be committed to version control.

Commands that call a Langflow server over HTTP, such as `lfx pull` or `lfx push`, use `--env ENVIRONMENT_NAME` to determine which Langflow instance to send the request to.

For example, to send a `push` request to a server named `local` in `environments.yaml`, run:

```bash
lfx push --env local
```

This command will send the request to the Langflow base URL at `http://127.0.0.1:7860` using a Langflow API key named `LANGFLOW_LOCAL_API_KEY`.


---

# Document: typescript-client

_Source: 

---
title: Langflow TypeScript client
slug: /typescript-client
---


The Langflow TypeScript client allows your TypeScript applications to programmatically interact with the Langflow API.

For the client code repository, see [langflow-client-ts](https://github.com/datastax/langflow-client-ts/).

For the npm package, see [@datastax/langflow-client](https://www.npmjs.com/package/@datastax/langflow-client).

## Install the Langflow TypeScript package

To install the Langflow typescript client package, use one of the following commands:




```bash
npm install @datastax/langflow-client
```




```bash
yarn add @datastax/langflow-client
```




```bash
pnpm add @datastax/langflow-client
```




## Initialize the Langflow TypeScript client

1. Import the client into your code.

    ```tsx
    import { LangflowClient } from "@datastax/langflow-client";
    ```

2. Initialize a `LangflowClient` object to interact with your server:

    ```tsx
    const baseUrl = "BASE_URL";
    const apiKey = "API_KEY";
    const client = new LangflowClient({ baseUrl, apiKey });
    ```

    Replace `BASE_URL` and `API_KEY` with values from your deployment.
    The default Langflow base URL is `http://localhost:7860`.
    To create an API key, see [API keys and authentication](/api-keys-and-authentication).

## Connect to your server and get responses

1. With your Langflow client initialized, test the connection by calling your Langflow server.

    The following example runs a flow (`runFlow`) by sending the flow ID and a chat input string:

    ```tsx
    import { LangflowClient } from "@datastax/langflow-client";

    const baseUrl = "http://localhost:7860";
    const client = new LangflowClient({ baseUrl });

    async function runFlow() {
        const flowId = "aa5a238b-02c0-4f03-bc5c-cc3a83335cdf";
        const flow = client.flow(flowId);
        const input = "Is anyone there?";

        const response = await flow.run(input);
        console.log(response);
    }

    runFlow().catch(console.error);
    ```

    Replace the following:

    * `baseUrl`: The URL of your Langflow server.
    * `flowId`: The ID of the flow you want to run.
    * `input`: The chat input message you want to send to trigger the flow.
    This is only valid for flows with a **Chat Input** component.

2. Review the result to confirm that the client connected to your Langflow server.

    The following example shows the response from a well-formed `runFlow` request that reached the Langflow server and successfully started the flow:

    ```
    FlowResponse {
      sessionId: 'aa5a238b-02c0-4f03-bc5c-cc3a83335cdf',
      outputs: [ { inputs: [Object], outputs: [Array] } ]
    }
    ```

    In this case, the response includes a [`sessionID`](/session-id) that is a unique identifier for the client-server session and an `outputs` array that contains information about the flow run.

3. Optional: If you want to get full response objects from the server, change `console.log` to stringify the returned JSON object:

    ```tsx
    console.log(JSON.stringify(response, null, 2));
    ```

    The exact structure of the returned `inputs` and `outputs` objects depends on the components and configuration of your flow.

4. Optional: If you want the response to include only the chat message from the **Chat Output** component, change `console.log` to use the `chatOutputText` convenience function:

    ```tsx
    console.log(response.chatOutputText());
    ```

## Use advanced TypeScript client features

The TypeScript client can do more than just connect to your server and run a flow.

This example builds on the quickstart with additional features for interacting with Langflow:

1. Pass [tweaks](/concepts-publish#input-schema) as an object with the request.
Tweaks are programmatic run-time overrides for component settings.

    This example changes the LLM used by a language model component in a flow::

    ```tsx
    const tweaks = { model_name: "gpt-4o-mini" };
    ```

2. Pass a [session ID](/session-id) with the request to separate the conversation from other flow runs, and to be able to continue this conversation by calling the same session ID in the future:

    ```tsx
    const session_id = "aa5a238b-02c0-4f03-bc5c-cc3a83335cdf";
    ```

3. Instead of calling `run` on the Flow object, call `stream` with the same arguments to get a streaming response:

    ```tsx
    const response = await client.flow(flowId).stream(input);

    for await (const event of response) {
      console.log(event);
    }
    ```

    The response is a [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) of objects.
    For more information on streaming Langflow responses, see the [`/run` endpoint](/api-flows-run#run-flow).

4. Run the modified TypeScript application to run the flow with `tweaks`, `session_id`, and streaming:

    ```tsx
    import { LangflowClient } from "@datastax/langflow-client";

    const baseUrl = "http://localhost:7860";
    const client = new LangflowClient({ baseUrl });

    async function runFlow() {
        const flowId = "aa5a238b-02c0-4f03-bc5c-cc3a83335cdf";
        const input = "Is anyone there?";
        const tweaks = { model_name: "gpt-4o-mini" };
        const session_id = "test-session";

        const response = await client.flow(flowId).stream(input, {
            session_id,
            tweaks,
          });

        for await (const event of response) {
            console.log(event);
        }

    }
    runFlow().catch(console.error);
    ```

    Replace the following:

    * `baseUrl`: The URL of your Langflow server.
    * `flowId`: The ID of the flow you want to run.
    * `input`: The chat input message you want to send to trigger the flow, assuming the flow has a **Chat Input** component.
    * `tweaks`: Any tweak modifiers to apply to the flow run.
    This example changes the LLM used by a component in the flow.
    * `session_id`: Pass a custom session ID.
    If omitted or empty, the flow ID is the default session ID.

    <details>
    <summary>Result</summary>

    With streaming enabled, the response includes the flow metatadata and timestamped events for flow activity.
    For example:

    ```text
    {
      event: 'add_message',
      data: {
        timestamp: '2025-05-23 15:52:48 UTC',
        sender: 'User',
        sender_name: 'User',
        session_id: 'test-session',
        text: 'Is anyone there?',
        files: [],
        error: false,
        edit: false,
        properties: {
          text_color: '',
          background_color: '',
          edited: false,
          source: [Object],
          icon: '',
          allow_markdown: false,
          positive_feedback: null,
          state: 'complete',
          targets: []
        },
        category: 'message',
        content_blocks: [],
        id: '7f096715-3f2d-4d84-88d6-5e2f76bf3fbe',
        flow_id: 'aa5a238b-02c0-4f03-bc5c-cc3a83335cdf',
        duration: null
      }
    }
    {
      event: 'token',
      data: {
        chunk: 'Absolutely',
        id: 'c5a99314-6b23-488b-84e2-038aa3e87fb5',
        timestamp: '2025-05-23 15:52:48 UTC'
      }
    }
    {
      event: 'token',
      data: {
        chunk: ',',
        id: 'c5a99314-6b23-488b-84e2-038aa3e87fb5',
        timestamp: '2025-05-23 15:52:48 UTC'
      }
    }
    {
      event: 'token',
      data: {
        chunk: " I'm",
        id: 'c5a99314-6b23-488b-84e2-038aa3e87fb5',
        timestamp: '2025-05-23 15:52:48 UTC'
      }
    }
    {
      event: 'token',
      data: {
        chunk: ' here',
        id: 'c5a99314-6b23-488b-84e2-038aa3e87fb5',
        timestamp: '2025-05-23 15:52:48 UTC'
      }
    }

    // this response is abbreviated

    {
      event: 'end',
      data: { result: { session_id: 'test-session', outputs: [Array] } }
    }
    ```

    </details>

## Retrieve Langflow logs with the TypeScript client

To retrieve [Langflow logs](/logging), you must enable log retrieval on your Langflow server by including the following values in your Langflow `.env` file:

```text
LANGFLOW_ENABLE_LOG_RETRIEVAL=True
LANGFLOW_LOG_RETRIEVER_BUFFER_SIZE=10000
LANGFLOW_LOG_LEVEL=DEBUG
```

The following example script starts streaming logs in the background, and then runs a flow so you can monitor the flow run:

```tsx

const baseUrl = "http://localhost:7863";
const flowId = "86f0bf45-0544-4e88-b0b1-8e622da7a7f0";

async function runFlow(client: LangflowClient) {
    const input = "Is anyone there?";
    const response = await client.flow(flowId).run(input);
    console.log('Flow response:', response);
}

async function main() {
    const client = new LangflowClient({ baseUrl: baseUrl });

    // Start streaming logs
    console.log('Starting log stream...');
    for await (const log of await client.logs.stream()) {
        console.log('Log:', log);
    }

    // Run the flow
    await runFlow(client);

}

main().catch(console.error);
```

Replace the following:

* `baseUrl`: The URL of your Langflow server.
* `flowId`: The ID of the flow you want to run.
* `input`: The chat input message you want to send to trigger the flow, assuming the flow has a **Chat Input** component.

Logs begin streaming indefinitely, and the flow runs once.

<details>
<summary>Result</summary>

The following example result is truncated for readability, but you can follow the messages to see how the flow instantiates its components, configures its model, and processes the outputs.

The `FlowResponse` object, at the end of the stream, is returned to the client with the flow result in the `outputs` array.

```text
Starting log stream...
Log: Log {
  timestamp: 2025-05-30T11:49:16.006Z,
  message: '2025-05-30T07:49:16.006127-0400 DEBUG Instantiating ChatInput of type component\n'
}
Log: Log {
  timestamp: 2025-05-30T11:49:16.029Z,
  message: '2025-05-30T07:49:16.029957-0400 DEBUG Instantiating Prompt of type component\n'
}
Log: Log {
  timestamp: 2025-05-30T11:49:16.049Z,
  message: '2025-05-30T07:49:16.049520-0400 DEBUG Instantiating ChatOutput of type component\n'
}
Log: Log {
  timestamp: 2025-05-30T11:49:16.069Z,
  message: '2025-05-30T07:49:16.069359-0400 DEBUG Instantiating OpenAIModel of type component\n'
}
Log: Log {
  timestamp: 2025-05-30T11:49:16.086Z,
  message: "2025-05-30T07:49:16.086426-0400 DEBUG Running layer 0 with 2 tasks, ['ChatInput-xjucM', 'Prompt-I3pxU']\n"
}
Log: Log {
  timestamp: 2025-05-30T11:49:16.101Z,
  message: '2025-05-30T07:49:16.101766-0400 DEBUG Building Chat Input\n'
}
Log: Log {
  timestamp: 2025-05-30T11:49:16.113Z,
  message: '2025-05-30T07:49:16.113343-0400 DEBUG Building Prompt\n'
}
Log: Log {
  timestamp: 2025-05-30T11:49:16.131Z,
  message: '2025-05-30T07:49:16.131423-0400 DEBUG Logged vertex build: 6bd9fe9c-5eea-4f05-a96d-f6de9dc77e3c\n'
}
Log: Log {
  timestamp: 2025-05-30T11:49:16.143Z,
  message: '2025-05-30T07:49:16.143295-0400 DEBUG Logged vertex build: 39c68ec9-3859-4fff-9b14-80b3271f8fbf\n'
}
Log: Log {
  timestamp: 2025-05-30T11:49:16.188Z,
  message: "2025-05-30T07:49:16.188730-0400 DEBUG Running layer 1 with 1 tasks, ['OpenAIModel-RtlZm']\n"
}
Log: Log {
  timestamp: 2025-05-30T11:49:16.201Z,
  message: '2025-05-30T07:49:16.201946-0400 DEBUG Building OpenAI\n'
}
Log: Log {
  timestamp: 2025-05-30T11:49:16.216Z,
  message: '2025-05-30T07:49:16.216622-0400 INFO Model name: gpt-4.1-mini\n'
}
Flow response: FlowResponse {
  sessionId: '86f0bf45-0544-4e88-b0b1-8e622da7a7f0',
  outputs: [ { inputs: [Object], outputs: [Array] } ]
}
Log: Log {
  timestamp: 2025-05-30T11:49:18.094Z,
  message: `2025-05-30T07:49:18.094364-0400 DEBUG Vertex OpenAIModel-RtlZm, result: <langflow.graph.utils.UnbuiltResult object at 0x364d24dd0>, object: {'text_output': "Hey there! I'm here and ready to help you build something awesome with AI. What are you thinking about creating today?"}\n`
}
```

</details>

For more information, see [Logs endpoints](/api-logs).

---

# Document: workflows-api

_Source: 

---
title: Workflow API (Beta)
slug: /workflow-api
---





:::warning Beta Feature
The Workflow API is currently in **Beta**.
The API endpoints and response formats may change in future releases.
:::

The Workflow API provides programmatic access to execute Langflow workflows synchronously or asynchronously.
Synchronous requests receive complete results immediately upon completion.
Asynchronous requests are queued in the background and will run until complete, or a request is issued to the [Stop Workflow endpoint](#stop-workflow-endpoint).

The Workflow API is part of the Langflow Developer v2 API and offers enhanced workflow execution capabilities compared to the v1 `/run` endpoint.



## Execute workflows endpoint (synchronous or asynchronous)

**Endpoint:**

```
POST /api/v2/workflows
```

**Description:** Execute a workflow synchronously and receive complete results immediately upon completion.
Set `background=false` to make the request synchronous.

### Example synchronous request

Execute a workflow synchronously and receive complete results immediately:



















### Example asynchronous request

For long-running workflows, set `background=true` to get a `job_id` immediately, and then poll the status [using the GET endpoint](#get-workflow-status-endpoint) until the job is complete.

To stop a job, send a POST request to the [Stop workflow endpoint](#stop-workflow-endpoint).

:::tip
The asynchronous request contains `stream` parameter, but streaming is not yet supported. The parameter is included for future compatibility.
:::

**Example request:**



















**Response:**

```json
{
  "job_id": "job_id_1234567890",
  "created_timestamp": "2025-01-15T10:30:00Z",
  "status": "queued",
  "errors": []
}
```

### Request body

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `flow_id` | `string` | Yes | - | The ID or endpoint name of the flow to execute. |
| `flow_version` | `string` | No | - | Optional version hash to pin to a specific flow version. |
| `background` | `boolean` | No | `false` | Must be `false` for synchronous execution. |
| `inputs` | `object` | No | `{}` | Inputs for the workflow execution. Uses component identifiers with dot notation (e.g., `ChatInput-abc.input_value`). See [Component identifiers and input structure](#component-identifiers-and-input-structure) for detailed information. |

### Example response

```json
{
  "flow_id": "flow_67ccd2be17f0819081ff3bb2cf6508e60bb6a6b452d3795b",
  "job_id": "job_id_1234567890",
  "object": "response",
  "created_at": 1741476542,
  "status": "completed",
  "errors": [],
  "inputs": {
    "ChatInput-abc.input_type": "chat",
    "ChatInput-abc.input_value": "what is 2+2",
    "ChatInput-abc.session_id": "session-123"
  },
  "outputs": {
    "ChatOutput-xyz": {
      "type": "message",
      "component_id": "ChatOutput-xyz",
      "status": "completed",
      "content": "2 + 2 equals 4."
    }
  },
  "metadata": {}
}
```

### Response body

The response includes an `outputs` field containing component-level results. Each output has a `type` field indicating the type of content:

| Type | Description | Example |
|------|-------------|---------|
| `message` | Text message content. | Chat responses, summaries |
| `image` | Image URL or data. | Generated images, processed images |
| `sql` | SQL query results. | Database query outputs |
| `data` | Structured data. | JSON objects, arrays |
| `file` | File reference. | Generated documents, reports |

## Get workflow status endpoint

**Endpoint:** `GET /api/v2/workflows`

**Description:** Retrieve the status and results of a workflow execution by job ID.

### Example request



















### Query parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `job_id` | `string` | Yes | The job ID returned from a workflow execution. |
| `stream` | `boolean` | No | If `true`, returns server-sent events stream. Default: `false`. |
| `sequence_id` | `integer` | No | Optional sequence ID to resume streaming from a specific point. |

### Example response

```json
{
  "flow_id": "flow_67ccd2be17f0819081ff3bb2cf6508e60bb6a6b452d3795b",
  "job_id": "job_id_1234567890",
  "object": "response",
  "created_at": 1741476542,
  "status": "completed",
  "errors": [],
  "outputs": {
    "ChatOutput-xyz": {
      "type": "message",
      "component_id": "ChatOutput-xyz",
      "status": "completed",
      "content": "Processing complete..."
    }
  },
  "input": [
    {
      "type": "text",
      "data": "Input text prompt for the workflow execution",
      "role": "User"
    }
  ],
  "metadata": {}
}
```

### Response body

The response includes a `status` field that indicates the current state of the workflow execution:

| Status | Description |
|--------|-------------|
| `queued` | Job is queued and waiting to start. |
| `in_progress` | Job is currently executing. |
| `completed` | Job completed successfully. |
| `failed` | Job failed during execution. |
| `error` | Job encountered an error. |

## Stop workflow endpoint

**Endpoint:** `POST /api/v2/workflows/stop`

**Description:** Stop a running workflow execution by job ID.

### Example request



















### Request body

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `job_id` | `string` | Yes | - | The job ID of the workflow to stop. |

### Example response

```json
{
  "job_id": "job_id_1234567890",
  "message": "Job job_id_1234567890 cancelled successfully."
}
```

## Component identifiers and input structure

The Workflows API uses component identifiers with dot notation to specify inputs for individual components in your workflow. This allows you to pass values to specific components and override component parameters.

Component identifiers use the format `{component_id}.{parameter_name}`.
When making requests to the Workflows API, include component identifiers in the `inputs` object.
For example, this demonstrates targeting multiple components and their parameters in a single request.

```json
{
  "flow_id": "your-flow-id",
  "inputs": {
    "ChatInput-abc.input_type": "chat",
    "ChatInput-abc.input_value": "what is 2+2",
    "ChatInput-abc.session_id": "session-123",
    "OpenSearchComponent-xyz.opensearch_url": "https://opensearch:9200",
    "LLMComponent-123.temperature": 0.7,
    "LLMComponent-123.max_tokens": 100
  }
}
```

To find the component ID in the Langflow UI, open your flow in Langflow, click the component, and then click **Controls**. The component ID is at the top of the **Controls** pane.

You can override any component's parameters.

## Error handling

The API uses standard HTTP status codes to indicate success or failure:

| Status Code | Description |
|-------------|-------------|
| `200 OK` | Request successful. |
| `400 Bad Request` | Invalid request parameters. |
| `401 Unauthorized` | Invalid or missing API key. |
| `404 Not Found` | Flow not found or developer API disabled. |
| `500 Internal Server Error` | Server error during execution. |
| `501 Not Implemented` | Endpoint not yet implemented. |

### Error response format

```json
{
  "detail": "Error message describing what went wrong"
}
```

