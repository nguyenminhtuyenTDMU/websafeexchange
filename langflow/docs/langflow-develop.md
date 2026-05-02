
---

# Document: api-keys-and-authentication

_Source: 

---
title: API keys and authentication
slug: /api-keys-and-authentication
---


:::warning
Never expose Langflow ports directly to the internet without proper security measures.
Set `LANGFLOW_AUTO_LOGIN=False`, use a non-default `LANGFLOW_SECRET_KEY`, and deploy your Langflow server behind a reverse proxy with authentication enabled.
For more information, see [Start a Langflow server with authentication enabled](#start-a-langflow-server-with-authentication-enabled).
:::

Authentication credentials help prevent unauthorized access to your Langflow server, flows, and services connected through components.

There are three types of credentials that you use in Langflow:

* [Langflow API keys](#langflow-api-keys): For authentication with the Langflow API and authorizing server-side Langflow actions like running flows and uploading files.
* [Component API keys](#component-api-keys): For authentication between Langflow and a service connected through a component, such as a model provider or third-party API.
* [Authentication environment variables](#authentication-environment-variables): These environment variables configure how Langflow handles user authentication and authorization.

## Langflow API keys {#langflow-api-keys}

You can use Langflow API keys to interact with Langflow programmatically.

By default, most Langflow API endpoints, such as `/v1/run/$FLOW_ID`, require authentication with a Langflow API key.

Langflow validates API keys against keys stored in the database, but you can configure Langflow to validate API keys against an environment variable instead.
For more information, see [`LANGFLOW_API_KEY_SOURCE`](#langflow-api-key-source).

To require API key authentication for flow webhook endpoints, use the [`LANGFLOW_WEBHOOK_AUTH_ENABLE`](/webhook#require-authentication-for-webhooks) environment variable.
To configure authentication for Langflow MCP servers, see [Use Langflow as an MCP server](/mcp-server).

### Langflow API key permissions

A Langflow API key adopts the privileges of the user who created it.
This means that API keys you create have the same permissions and access that you do, including access to your flows, components, and Langflow database.
A Langflow API key cannot be used to access resources outside of your own Langflow server.

In single-user environments, you are always a superuser, and your Langflow API keys always have superuser privileges.

In multi-user environments, users who aren't superusers cannot use their API keys to access other users' resources.
Superusers can only run their own flows, and cannot run flows owned by other users.
You must [start your Langflow server with authentication enabled](#start-a-langflow-server-with-authentication-enabled) to allow superusers to manage users and create non-superuser accounts.

### Create a Langflow API key

You can generate a Langflow API key in your Langflow **Settings** or with the Langflow CLI.

The CLI option is required if your Langflow server is running in `--backend-only` mode.




1. In the Langflow header, click your profile icon, and then select **Settings**.
2. Click **Langflow API Keys**, and then click **Add New**.
3. Name your key, and then click **Create API Key**.
4. Copy the API key and store it securely.




If you're serving your flow with `--backend-only=true`, you can't create API keys in your Langflow **Settings** because the frontend isn't running.
In this case, you must create API keys with the Langflow CLI.

1. Recommended: [Start your Langflow server with authentication enabled](#start-a-langflow-server-with-authentication-enabled).

    The Langflow team recommends enabling authentication for security reasons to prevent unauthorized creation of API keys and superusers, especially in production environments.
    If authentication isn't enabled (`LANGFLOW_AUTO_LOGIN=True`), all users are effectively superusers, and they can create API keys with the Langflow CLI.

2. Create an API key with [`langflow api-key`](/configuration-cli#langflow-api-key):

    ```shell
    uv run langflow api-key
    ```

    All API keys created with the Langflow CLI have superuser privileges because the command requires superuser authentication, and Langflow API keys adopt the privileges of the user who created them.




### Use a Langflow API key

To authenticate Langflow API requests, pass your Langflow API key an `x-api-key` header or query parameter.




```shell
curl -X POST \
  "http://$LANGFLOW_SERVER_ADDRESS/api/v1/run/$FLOW_ID?stream=false" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $LANGFLOW_API_KEY" \
  -d '{"inputs": {"text":""}, "tweaks": {}}'
```




```shell
curl -X POST \
  "http://$LANGFLOW_SERVER_ADDRESS/api/v1/run/$FLOW_ID?x-api-key=$LANGFLOW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"inputs": {"text":""}, "tweaks": {}}'
```




For more information about forming Langflow API requests, see [Get started with the Langflow API](/api-reference-api-examples) and [Trigger flows with the Langflow API](/concepts-publish).

### Track API key usage

By default, Langflow tracks API key usage through `total_uses` and `last_used_at` records in your [Langflow database](/memory).

To disable API key tracking, set `LANGFLOW_DISABLE_TRACK_APIKEY_USAGE=True` in your [Langflow environment variables](/environment-variables).
This can help avoid database contention during periods of high concurrency.

### Revoke an API key

To revoke and delete an API key, do the following:

1. In the Langflow header, click your profile icon, and then select **Settings**.
2. Click **Langflow API Keys**.
3. Select the keys you want to delete, and then click  **Delete**.

This action immediately invalidates the key and prevents it from being used again.

## Component API keys {#component-api-keys}

Component API keys authorize access to external services that are called by components in your flows, such as model providers, databases, or third-party APIs.
These aren't Langflow API keys or general application credentials.

In Langflow, you can store component API keys in global variables in your **Settings** or import them from your runtime environment.
For more information, see [Global variables](/configuration-global-variables).

You create and manage component API keys within the service provider's platform.
Langflow only stores the encrypted key value or a secure reference to a key stored elsewhere; it doesn't manage the actual credentials at the source.
This means that deleting a global variable from Langflow doesn't delete or invalidate the actual API key in the service provider's system.
You must delete or rotate component API keys directly using the service provider's interface or API.

For added security, you can set `LANGFLOW_REMOVE_API_KEYS=True` to omit API keys and tokens from flow data in your [Langflow database](/memory).
Additionally, when [exporting flows](/concepts-flows-import), you can choose to omit API keys from the exported flow JSON.

## Authentication environment variables

This section describes the available authentication configuration variables.

You can use the [`.env.example`](https://github.com/langflow-ai/langflow/blob/main/.env.example) file in the Langflow repository as a template for your own `.env` file.

For JWT authentication configuration, including algorithm selection and key management, see [JWT authentication](/jwt-authentication).

### LANGFLOW_AUTO_LOGIN {#langflow-auto-login}

This variable controls whether authentication is required to access your Langflow server, including the visual editor, API, and Langflow CLI:

* If `LANGFLOW_AUTO_LOGIN=False`, automatic login is disabled. Users must sign in to the visual editor, authenticate as a superuser to run certain Langflow CLI commands, and use a Langflow API key for Langflow API requests.
If `false`, the Langflow team recommends that you also explicitly set [`LANGFLOW_SUPERUSER` and `LANGFLOW_SUPERUSER_PASSWORD`](#langflow-superuser) to avoid using the insecure default values.

* If `LANGFLOW_AUTO_LOGIN=True` (default), all API requests require authentication with a Langflow API key, but the visual editor automatically signs in all users as superusers, and Langflow uses _only_ the default [superuser credentials](/api-keys-and-authentication#langflow-superuser).
All users access the same visual editor environment without password protection, they can run all Langflow CLI commands as superusers, and Langflow automatically authenticates internal requests between the backend and frontend based on the users' superuser privileges.
If you also want to bypass authentication for Langflow API requests in addition to other bypassed authentication, see [`LANGFLOW_SKIP_AUTH_AUTO_LOGIN`](/api-keys-and-authentication#langflow-skip-auth-auto-login).

Langflow doesn't allow users to simultaneously edit the same flow in real time.
If two users edit the same flow, Langflow saves only the work of the most recent editor based on the state of that user's [workspace](/concepts-overview#workspace). Any changes made by the other user in the interim are overwritten.

#### Default authentication enforcement and LANGFLOW_SKIP_AUTH_AUTO_LOGIN {#langflow-skip-auth-auto-login}

In Langflow version 1.6, the default settings are `LANGFLOW_AUTO_LOGIN=True` and `LANGFLOW_SKIP_AUTH_AUTO_LOGIN=False`.
This enforces authentication for API requests only, as explained in the preceding section.

For temporary backwards compatibility, you can revert to the fully unauthenticated behavior from earlier versions by setting both variables to `true`.
However, a future release will set `LANGFLOW_AUTO_LOGIN=False` and remove `LANGFLOW_SKIP_AUTH_AUTO_LOGIN`.
At that point, Langflow will strictly enforce API key authentication for API requests, and you can manually disable authentication for some features, like the visual editor, by setting `LANGFLOW_AUTO_LOGIN=True`.

<details>
<summary>Authentication enforcement in earlier versions</summary>

Langflow version 1.5 was the first version that could enforce authentication for Langflow API requests, regardless of the value of `LANGFLOW_AUTO_LOGIN`.
As a temporary bypass for backwards compatibility, this version added the `LANGFLOW_SKIP_AUTH_AUTO_LOGIN` environment variable and set both variables to `true` by default to preserve the fully unauthenticated behavior from earlier versions.
This allowed users to upgrade to version 1.5 with no change in the authentication behavior.

In Langflow versions earlier than 1.5, Langflow API requests didn't require authentication.
Additionally, the default setting of `LANGFLOW_AUTO_LOGIN=True` automatically granted all users superuser privileges in the visual editor, and it allowed all users to run all Langflow CLI commands as superusers.
</details>

### LANGFLOW_ENABLE_SUPERUSER_CLI {#langflow-enable-superuser-cli}

Controls the availability of the `langflow superuser` command in the Langflow CLI.
The default is `true`, but `false` is recommended to prevent unrestricted superuser creation.
For more information, see [`langflow superuser`](/configuration-cli#langflow-superuser).

### LANGFLOW_SUPERUSER and LANGFLOW_SUPERUSER_PASSWORD {#langflow-superuser}

These variables specify the username and password for the Langflow server's superuser.

```text
LANGFLOW_SUPERUSER=administrator
LANGFLOW_SUPERUSER_PASSWORD=securepassword
```

They are required if `LANGFLOW_AUTO_LOGIN=False`.
Otherwise, they aren't relevant.

When you [start a Langflow server with authentication enabled](#start-a-langflow-server-with-authentication-enabled), if these variables are required but _not_ set, then Langflow uses the default values of `langflow` and `langflow`.
These defaults don't apply when using the Langflow CLI command [`langflow superuser`](/configuration-cli#langflow-superuser).

### LANGFLOW_SECRET_KEY {#langflow-secret-key}

This environment variable stores a secret key used for encrypting sensitive data like API keys and for JWT signing when using the HS256 algorithm.
Langflow uses the [Fernet](https://pypi.org/project/cryptography/) library for secret key encryption.
For JWT-specific configuration, see [JWT authentication](/jwt-authentication).

If no secret key is provided, Langflow automatically generates one.

However, you should generate and explicitly set your own key in production environments.
This is particularly important for multi-instance deployments like Kubernetes to ensure consistent encryption across instances.

To generate a secret encryption key for `LANGFLOW_SECRET_KEY`, do the following:

1. Run the command to generate and copy a secret to the clipboard.

    
    

    * **macOS**: Generate a secret key and copy it to the clipboard:

        ```bash
        python3 -c "from secrets import token_urlsafe; print(f'LANGFLOW_SECRET_KEY={token_urlsafe(32)}')" | pbcopy
        ```

    * **Linux**: Generate a secret key and copy it to the clipboard:

        ```bash
        python3 -c "from secrets import token_urlsafe; print(f'LANGFLOW_SECRET_KEY={token_urlsafe(32)}')" | xclip -selection clipboard
        ```

    * **Unix**: Generate a secret key and print it to the terminal to manually copy it:

        ```bash
        python3 -c "from secrets import token_urlsafe; print(f'LANGFLOW_SECRET_KEY={token_urlsafe(32)}')"
        ```

    
    

    * Generate a secret key and copy it to the clipboard:

        ```bash
        python -c "from secrets import token_urlsafe; print(f'LANGFLOW_SECRET_KEY={token_urlsafe(32)}')"
        ```

    * Generate a secret key and print it to the terminal to manually copy it:

        ```bash

        # Or just print
        python -c "from secrets import token_urlsafe; print(f'LANGFLOW_SECRET_KEY={token_urlsafe(32)}')"
        ```

    
    

2. Paste the value into your `.env` file:

    ```text
    LANGFLOW_SECRET_KEY=dBuu...2kM2_fb
    ```

    If you're running Langflow on Docker, reference the `LANGFLOW_SECRET_KEY` from your `.env` file in the `docker-compose.yml` file like this:

        ```yaml
        environment:
          - LANGFLOW_SECRET_KEY=${LANGFLOW_SECRET_KEY}
        ```

#### Rotate the secret key {#rotating-the-secret-key}

Rotate `LANGFLOW_SECRET_KEY` if the key might have been compromised and as part of your routine credential management practices.
Langflow provides a migration script that re-encrypts stored credentials and other sensitive data with a new key so you can rotate without losing access.

For more information, see [Secret Key Rotation](https://github.com/langflow-ai/langflow/blob/main/SECURITY.md#secret-key-rotation) in the Langflow Security Policy.

### LANGFLOW_NEW_USER_IS_ACTIVE {#langflow-new-user-is-active}

When `LANGFLOW_NEW_USER_IS_ACTIVE=False` (default), accounts created by superusers are inactive by default and must be explicitly activated before users can sign in to the visual editor.
The superuser can also deactivate a user's account as needed.

When `LANGFLOW_NEW_USER_IS_ACTIVE=True`, accounts created by superusers are automatically activated.

```text
LANGFLOW_NEW_USER_IS_ACTIVE=False
```

Only superusers can manage user accounts for a Langflow server, but user management only matters if your server has authentication enabled.
For more information, see [Start a Langflow server with authentication enabled](#start-a-langflow-server-with-authentication-enabled).

### LANGFLOW_API_KEY_SOURCE {#langflow-api-key-source}

This variable controls how Langflow validates API keys.

| Value | Description |
|-------|-------------|
| `db` (default) | Validates API keys against [Langflow API keys](#langflow-api-keys) stored in the database. This is the standard behavior where users create and manage API keys through the Langflow UI or CLI. |
| `env` | Validates API keys against the `LANGFLOW_API_KEY` environment variable. Useful for Kubernetes deployments, CI/CD pipelines, or any environment where you want to inject a pre-defined API key without database configuration. |

By default, Langflow validates the `x-api-key` header against the Langflow database with `LANGFLOW_API_KEY_SOURCE=db`.
When using database-based validation, you can create multiple keys with per-user permissions, track usage, and manage keys through the Langflow UI or CLI.

When `LANGFLOW_API_KEY_SOURCE=env`, Langflow validates the `x-api-key` header against the value of the `LANGFLOW_API_KEY` environment variable.
This means Langflow runs securely in stateless environments, such as with LFX or Kubernetes secrets.

When `LANGFLOW_API_KEY_SOURCE=env`, only a single API key can be used for the deployment. All authenticated requests use the same API key, and successful authentication grants superuser privileges.
This mode is designed for single-tenant deployments or automated systems, not multi-user environments where different users need different access levels. To rotate your keys, update the environment variable and restart the Langflow server.

To enable environment-based API key validation:

1. In the Langflow `.env` file, set the API key source to `env`:

    ```text
    LANGFLOW_API_KEY_SOURCE=env
    ```

2. In the Langflow `.env` file, set the API key value:

    ```text
    LANGFLOW_API_KEY=your-secure-api-key
    ```

3. Use the API key in your requests:

    ```shell
    curl -X POST \
      "http://LANGFLOW_SERVER_ADDRESS/api/v1/run/FLOW_ID?stream=false" \
      -H "Content-Type: application/json" \
      -H "x-api-key: LANGFLOW_API_KEY" \
      -d '{"inputs": {"text":""}, "tweaks": {}}'
    ```

    Replace `LANGFLOW_SERVER_ADDRESS`, `FLOW_ID`, and `LANGFLOW_API_KEY` with the values from your deployment.

<details>
<summary>Kubernetes deployment example</summary>

To configure an environment-based API key in a Kubernetes Secret, do the following:

1. Create a Kubernetes Secret with your API key:

    ```yaml
    apiVersion: v1
    kind: Secret
    metadata:
      name: langflow-api-key
    type: Opaque
    stringData:
      api-key: "YOUR_API_KEY"
    ```

    Replace `YOUR_API_KEY` with the `LANGFLOW_API_KEY` value from the Langflow `.env` file.

2. Reference the `langflow-api-key` Secret in your Kubernetes deployment:

    ```yaml
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: langflow
    spec:
      template:
        spec:
          containers:
          - name: langflow
            image: langflowai/langflow:latest
            env:
            - name: LANGFLOW_API_KEY_SOURCE
              value: "env"
            - name: LANGFLOW_API_KEY
              valueFrom:
                secretKeyRef:
                  name: langflow-api-key
                  key: api-key
    ```

</details>

<details>
<summary>Docker Compose example</summary>

To configure an environment-based API key in Docker Compose, do the following:

1. Set the API key in your Langflow `.env` file.

    ```text
    LANGFLOW_API_KEY=your-secure-api-key
    ```

    Replace `YOUR_API_KEY` with your actual Langflow API key value.

2. Create or update your `docker-compose.yml` file to set `LANGFLOW_API_KEY_SOURCE=env` and reference the `LANGFLOW_API_KEY`.

    ```yaml
    services:
      langflow:
        image: langflowai/langflow:latest
        environment:
          - LANGFLOW_API_KEY_SOURCE=env
          - LANGFLOW_API_KEY=${LANGFLOW_API_KEY}
        ports:
          - "7860:7860"
    ```

</details>

### LANGFLOW_CORS_* {#cors-configuration-for-authentication}

Cross-Origin Resource Sharing (CORS) configuration controls how authentication credentials are handled when your Langflow frontend and backend are served from different origins.
The following `LANGFLOW_CORS_*` environment variables are available:

| Variable | Format | Default | Description |
|----------|--------|---------|-------------|
| `LANGFLOW_CORS_ALLOW_CREDENTIALS` | Boolean | `True` | Whether to allow credentials, such as cookies and authorization headers, in CORS requests. |
| `LANGFLOW_CORS_ALLOW_HEADERS` | List[String] or String | `*` | The allowed headers for CORS requests. Provide a comma-separated list of headers or use `*` to allow all headers. |
| `LANGFLOW_CORS_ALLOW_METHODS` | List[String] or String | `*` | The allowed HTTP methods for CORS requests. Provide a comma-separated list of methods or use `*` to allow all methods. |
| `LANGFLOW_CORS_ORIGINS` | String | `*` | The allowed CORS origins. Provide a comma-separated list of origins or use `*` for all origins. |

The default configuration enables CORS credentials and uses wildcards (`*`) to allow all origins, headers, and methods:

```text
LANGFLOW_CORS_ORIGINS=*
LANGFLOW_CORS_ALLOW_CREDENTIALS=True
LANGFLOW_CORS_ALLOW_HEADERS=*
LANGFLOW_CORS_ALLOW_METHODS=*
```

:::danger
Langflow's default CORS settings can be a security risk in production environments because any website can make requests to your Langflow API, and any website can include credentials in cross-origin requests, including authentication cookies and authorization headers.

In production deployments, specify exact origins in `LANGFLOW_CORS_ORIGINS`.
You can also specify allowed headers and methods, if needed.
For example:

```text
LANGFLOW_CORS_ORIGINS=["https://yourdomain.com","https://app.yourdomain.com"]
LANGFLOW_CORS_ALLOW_CREDENTIALS=True
LANGFLOW_CORS_ALLOW_HEADERS=["Content-Type","Authorization"]
LANGFLOW_CORS_ALLOW_METHODS=["GET","POST","PUT"]
```
:::

### SSRF protection {#ssrf-protection}

The following environment variables configure Server-Side Request Forgery (SSRF) protection for the [**API Request** component](/api-request).
SSRF protection prevents requests to internal or private network resources, such as private IP ranges, loopback addresses, and cloud metadata endpoints.

| Variable | Format | Default | Description |
|----------|--------|---------|-------------|
| `LANGFLOW_SSRF_PROTECTION_ENABLED` | Boolean | `False` | Enable SSRF protection for the **API Request** component. When enabled, the component blocks requests to private IP addresses. When disabled, requests are not blocked. |
| `LANGFLOW_SSRF_ALLOWED_HOSTS` | List[String] | Not set | A comma-separated list of allowed hosts, IP addresses, or CIDR ranges that can bypass SSRF protection checks. For example: `192.168.1.0/24,10.0.0.5,*.internal.company.local`.|

### LANGFLOW_WEBHOOK_AUTH_ENABLE {#langflow-webhook-auth-enable}

This variable controls whether API key authentication is required for webhook endpoints.

| Variable | Format | Default | Description |
|----------|--------|---------|-------------|
| `LANGFLOW_WEBHOOK_AUTH_ENABLE` | Boolean | `False` | When `True`, webhook endpoints require API key authentication and validate that the authenticated user owns the flow being executed. When `False`, no Langflow API key is required and all requests to the webhook endpoint are treated as being sent by the flow owner. |

By default, webhooks run as the flow owner without authentication with `LANGFLOW_WEBHOOK_AUTH_ENABLE=False`.

To require API key authentication for webhooks, in your Langflow `.env` file, set `LANGFLOW_WEBHOOK_AUTH_ENABLE=True`.

When webhook authentication is enabled, you must provide a Langflow API key with each webhook request as an HTTP header or query parameter. For more information, see [Require authentication for webhooks](/webhook#require-authentication-for-webhooks).

## Start a Langflow server with authentication enabled

This section shows you how to use the [authentication environment variables](/api-keys-and-authentication#authentication-environment-variables) to deploy a Langflow server with authentication enabled.
This involves disabling automatic login, setting superuser credentials, generating a secret encryption key, and enabling user management.

This configuration is recommended for any deployment where Langflow is exposed to a shared or public network, or where multiple users access the same Langflow server.

With authentication enabled, all users must sign in to the visual editor with valid credentials, and API requests require authentication with a Langflow API key.
Additionally, you must sign in as a superuser to manage users and [create a Langflow API key](#create-a-langflow-api-key) with superuser privileges.

### Start the Langflow server

1. Create a `.env` file with the following variables:

    ```text
    LANGFLOW_AUTO_LOGIN=False
    LANGFLOW_SUPERUSER=
    LANGFLOW_SUPERUSER_PASSWORD=
    LANGFLOW_SECRET_KEY=
    LANGFLOW_NEW_USER_IS_ACTIVE=False
    LANGFLOW_ENABLE_SUPERUSER_CLI=False
    ```

    Your `.env` file can have other environment variables.
    This example focuses on authentication variables.

2. Set `LANGFLOW_SUPERUSER` and `LANGFLOW_SUPERUSER_PASSWORD` to your desired superuser credentials.

    For a one-time test, you can use basic credentials like `administrator` and `password`.
    Strong, securely-stored credentials are recommended in genuine development and production environments.

3. Recommended: Generate and set a `LANGFLOW_SECRET_KEY` for encrypting sensitive data.

    If you don't set a secret key, Langflow generates one automatically, but this isn't recommended for production environments.

    For instructions on generating and setting a secret key, see [`LANGFLOW_SECRET_KEY`](#langflow-secret-key).

4. Save your `.env` file with the populated variables. For example:

    ```text
    LANGFLOW_AUTO_LOGIN=False
    LANGFLOW_SUPERUSER=administrator
    LANGFLOW_SUPERUSER_PASSWORD=securepassword
    LANGFLOW_SECRET_KEY=dBuu...2kM2_fb
    LANGFLOW_NEW_USER_IS_ACTIVE=False
    LANGFLOW_ENABLE_SUPERUSER_CLI=False
    ```

5. Start Langflow with the configuration from your `.env` file:

    ```text
    uv run langflow run --env-file .env
    ```

    Starting Langflow with a `.env` file automatically authenticates you as the superuser set in `LANGFLOW_SUPERUSER` and `LANGFLOW_SUPERUSER_PASSWORD`.
    If you don't explicitly set these variables, the default values are `langflow` and `langflow` for system auto-login.

6. Verify the server is running. The default location is `http://localhost:7860`.

Next, you can add users to your Langflow server to collaborate with others on flows.

### Manage users as an administrator

1. To complete your first-time login as a superuser, go to `http://localhost:7860/login`.

    If you aren't using the default location, replace `localhost:7860` with your server's address.

2. Log in with the superuser credentials you set in your `.env` (`LANGFLOW_SUPERUSER` and `LANGFLOW_SUPERUSER_PASSWORD`).

3. To manage users on your server, navigate to `/admin`, such as `http://localhost:7860/admin`, click your profile icon, and then click **Admin Page**.

    As a superuser, you can add users, set permissions, reset passwords, and delete accounts.

4. To add a user, click **New User**, and then complete the user account form:

    1. Enter a username and password.
    2. To activate the account immediately, select **Active**. Inactive users cannot sign in or access flows they created before becoming inactive.
    3. Deselect **Superuser** if you don't want the user to have full administrative privileges.
    4. Click **Save**. The new user appears in the **Admin Page**.

5. Send the credentials to the user so they can sign in to Langflow. The superuser sets the initial password when creating the account, so users must receive their login credentials from the superuser.

6. To test the new user's access, sign out of Langflow, and then sign in with the new user's credentials.

    Try to access the `/admin` page.
    You are redirected to the `/flows` page if the new user isn't a superuser.

## See also

* [Langflow environment variables](/environment-variables)
* [Langflow Security Policy](https://github.com/langflow-ai/langflow/blob/main/SECURITY.md) — reporting vulnerabilities, security configuration, and [secret key rotation](https://github.com/langflow-ai/langflow/blob/main/SECURITY.md#secret-key-rotation)


---

# Document: concepts-file-management

_Source: 

---
title: Manage files
slug: /concepts-file-management
---


Each Langflow server has a file management system where you can store files that you want to use in your flows.

Files uploaded to Langflow file management are stored in Langflow's [storage backend (local or AWS S3)](/concepts-file-management#configure-file-storage), and they are available to all of your flows.

Uploading files to Langflow file management keeps your files in a central location, and allows you to reuse files across flows without repeated manual uploads.

## Use the file management UI

You can use the file management UI to upload files from your local machine to your own Langflow server.
You can also manage all files that have been uploaded to your Langflow server.

1. Navigate to Langflow file management:

    * **Langflow Desktop**: In Langflow, on the [**Projects** page](/concepts-flows#projects) page, click **My Files** below the list of projects.
    * **Langflow OSS**: From a browser, navigate to your Langflow server's `/files` endpoint, such as `http://localhost:7860/files`. Modify the base URL as needed for your Langflow server.
    * **Backend-only**: For programmatic file management, use the [Langflow API files endpoints](/api-files). However, the following steps assume you're using the file management UI.

2. On the **My Files** page, click **Upload**.

3. Select one or more files to upload.

After uploading files, you can rename, download, copy, or delete files within the file management UI.
To delete a file, hover over a file's icon, select it, and then click  **Delete**.
You can delete multiple files in a single action.
To download a file, hover over a file's icon, select it, and then click  **Download**.
If you download multiple files in a single action, they are saved together in a zip file.

## Upload and manage files with the Langflow API

With the Langflow API, you can upload and manage files in Langflow file management, and you can send files to flows programmatically at runtime.

For more information and examples, see [Files endpoints](/api-files) and [Create a chatbot that can ingest files](/chat-with-files).

## Set the maximum file size

By default, the maximum file size is 1024 MB.
To modify this value, change the `LANGFLOW_MAX_FILE_SIZE_UPLOAD` [environment variable](/environment-variables).

## Use files in a flow

To use files in your Langflow file management system in a flow, add a component that accepts file input to your flow, such as the **Read File** component.

For example, add a **Read File** component to your flow, click **Select files**, and then select files from the **My Files** list.

This list includes all files in your server's file management system, but you can only select [file types that are supported by the **Read File** component](/read-file).
If you need another file type, you must use a different component that supports that file type, or you need to convert it to a supported type before uploading it.

For more information about the **Read File** component and other data loading components, see the [**Read file** component](/read-file).

### Load files at runtime

You can use preloaded files in your flows, and you can load files at runtime, if your flow accepts file input.
To enable file input in your flow, do the following:

1. Add a [**Read File** component](/read-file) to your flow.

2. Click **Share**, select **API access**, and then click **Input Schema** to add [`tweaks`](/concepts-publish#input-schema) to the request payload in the flow's automatically generated code snippets.

3. Expand the **File** section, find the **Files** row, and then enable **Expose Input** to allow the parameter to be set at runtime through the Langflow API.

4. Close the **Input Schema** pane to return to the **API access** pane.
The payload in each code snippet now includes `tweaks` with your **Read File** component's ID and the `path` key that you enabled in **Input Schema**:

    ```json
    "tweaks": {
	    "File-qYD5w": {
		    "path": []
	    }
	}
    ```

5. When you run this flow programmatically, your script must upload a file to Langflow file management, and then pass the returned `file_path` to the `path` tweak in the `/run` request:

    ```json
    "tweaks": {
        "FILE_COMPONENT_ID": {
            "path": [ "file_path" ]
        }
    }
    ```

    For a complete example see [Create a chatbot that can ingest files](/chat-with-files) and [Files endpoints](/api-files).

    If you want to upload multiple files, you can pass multiple `file_path` values in the `path` array, such as `[ "path1", "path2" ]`.

## Upload images

Langflow supports base64 images in the following formats:

* PNG
* JPG/JPEG
* GIF
* BMP
* WebP

You can upload images to the **Playground** chat interface and as runtime input with the Langflow API.

* In the **Playground**, you can drag-and-drop images into the chat input area, or you can click the **Attach image** icon to select an image to upload.

* When you trigger a flow with the `/api/v1/run/$FLOW_ID` endpoint, you can use the `files` parameter to attach image data as a base64-encoded string:

   ```bash
   curl -X POST "http://$LANGFLOW_SERVER_ADDRESS/api/v1/run/$FLOW_ID" \
   -H "Content-Type: application/json" \
   -H "x-api-key: $LANGFLOW_API_KEY" \
   -d '{
      "session_id": "custom_session_123",
      "input_value": "What is in this image?",
      "input_type": "chat",
      "output_type": "chat",
      "files": ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."]
   }'
   ```

For more specialized image processing, browse  [**Bundles**] or [create your own components](/components-custom-components).

## Work with video files

For videos, see the **Twelve Labs** and **YouTube**  [**Bundles**](/components-bundle-components).

## Configure file storage

Langflow supports two storage backends for file management.

* **Local storage**: Langflow's default storage backend. Files are stored locally in your [Langflow configuration directory](/memory). Set `LANGFLOW_STORAGE_TYPE=local` or leave it unset to use local storage.

* **S3 storage**: Files are stored in an AWS S3 bucket.
Langflow uses the [boto3](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html) library to interact with S3.

To use S3 as your file storage backend, add the following configuration to your `.env` file:

```text
# S3 Storage Configuration
LANGFLOW_STORAGE_TYPE=s3
LANGFLOW_OBJECT_STORAGE_BUCKET_NAME=S3_BUCKET_NAME
LANGFLOW_OBJECT_STORAGE_PREFIX=S3_BUCKET_DIRECTORY

# AWS Credentials (required for S3)
AWS_ACCESS_KEY_ID=S3_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=S3_ACCESS_SECRET_KEY
AWS_DEFAULT_REGION=S3_REGION
```

Replace the following placeholders with the actual values for your S3 instance:

* `S3_BUCKET_NAME`: The name of your S3 bucket.
* `S3_BUCKET_DIRECTORY`: An optional folder path within the bucket where files are stored, such as `s3://S3_BUCKET_NAME/S3_BUCKET_DIRECTORY`.
* `S3_ACCESS_KEY`: Your AWS Access Key ID.
* `S3_ACCESS_SECRET_KEY`: Your AWS Secret Access Key.
* `S3_REGION`: The AWS region where your bucket is located, such as `us-east-2`.

Your AWS credentials must have the necessary permissions to perform the required S3 operations for your use case, such as reading, writing, and deleting files in S3.
This example policy allows basic CRUD operations on S3 objects.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "LangflowS3StorageAccess",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket",
                "s3:PutObjectTagging",
            ],
            "Resource": [
                "arn:aws:s3:::S3_BUCKET_NAME",
                "arn:aws:s3:::S3_BUCKET_NAME/S3_BUCKET_DIRECTORY/*"
            ]
        }
    ]
}
```

Replace the following placeholders with the actual values for your IAM policy and S3 instance:

* `S3_BUCKET_NAME`: The name of your S3 bucket.
* `S3_BUCKET_DIRECTORY`: An optional folder path within the bucket where files are stored, such as `s3://S3_BUCKET_NAME/S3_BUCKET_DIRECTORY`.

For more information, see the [AWS documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_change-permissions.html).

**Google Drive** storage is available through the [**Read File**](/read-file) and [**Write file**](/write-file) components, but you cannot use environment variables to configure it.

## File storage environment variables {#file-storage-environment-variables}

The following environment variables configure file storage backends for Langflow's file management system:

| Variable | Format | Default | Description |
|----------|--------|---------|-------------|
| `LANGFLOW_STORAGE_TYPE` | String | `local` | Set the file storage backend. Supported values: `local` (files stored in the Langflow configuration directory) or `s3` (files stored in AWS S3). For S3 storage, you must also configure AWS credentials and bucket settings. |
| `LANGFLOW_OBJECT_STORAGE_BUCKET_NAME` | String | Not set | The name of the S3 bucket to use for file storage. Required when `LANGFLOW_STORAGE_TYPE=s3`. |
| `LANGFLOW_OBJECT_STORAGE_PREFIX` | String | Not set | Optional prefix/folder path within the S3 bucket where files will be stored. If not set, files are stored at the bucket root. |
| `LANGFLOW_OBJECT_STORAGE_TAGS` | JSON object | Not set | Optional S3 object tags applied to stored files when `LANGFLOW_STORAGE_TYPE=s3`. Ignored for local storage. Provided as a JSON map of string keys to string values, such as `{"env": "prod", "owner": "data-team"}`. |

## See also

* [Components reference](/concepts-components)

---

# Document: concepts-voice-mode

_Source: 

---
title: Use voice mode
slug: /concepts-voice-mode
---


:::info
Voice mode is not available in Langflow Desktop.
To use voice mode, [Install the Langflow OSS Python package](/get-started-installation#install-and-run-the-langflow-oss-python-package).
:::

You can use Langflow's voice mode to interact with your flows verbally through a microphone and speakers.

## Prerequisites

Voice mode requires the following:

* A flow with **Chat Input**, **Language Model**, and **Chat Output** components.

    If your flow has an **Agent** component, make sure the tools in your flow have accurate names and descriptions to help the agent choose which tools to use.

    Additionally, be aware that voice mode overrides typed instructions in the **Agent** component's **Agent Instructions** field.

* An [OpenAI](https://platform.openai.com/) account and an OpenAI API key because Langflow uses the OpenAI API to process voice input and generate responses.

* Optional: An [ElevenLabs](https://elevenlabs.io) API key to enable more voice options for the LLM's response.

* A microphone and speakers.

    A high quality microphone and minimal background noise are recommended for optimal voice comprehension.

## Test voice mode in the Playground

In the **Playground**, click the  **Microphone** to enable voice mode and verbally interact with your flows through a microphone and speakers.

The following steps use the **Simple Agent** template to demonstrate how to enable voice mode:

1. Create a flow based on the **Simple Agent** template.

2. Add your **OpenAI API key** credentials to the **Agent** component.

3. Click **Playground**.

4. Click the  **Microphone** icon to open the **Voice mode** dialog.

5. Enter your OpenAI API key, and then click **Save**. Langflow saves the key as a [global variable](/configuration-global-variables).

6. If you are prompted to grant microphone access, you must allow microphone access to use voice mode.
If microphone access is blocked, you won't be able to provide verbal input.

7. For **Audio Input**, select the input device to use with voice mode.

8. Optional: Add an ElevenLabs API key to enable more voices for the LLM's response.
Langflow saves this key as a global variable.

9. For **Preferred Language**, select the language you want to use for your conversations with the LLM.
This option changes both the expected input language and the response language.

10. Speak into your microphone to start the chat.

    If configured correctly, the waveform registers your input, and then the agent's logic and response are described verbally and in the **Playground**.

## Develop applications with websockets endpoints

Langflow exposes two OpenAI Realtime API-compatible websocket endpoints for your flows.
You can build applications against these endpoints the same way you would build against [OpenAI Realtime API websockets](https://platform.openai.com/docs/guides/realtime#connect-with-websockets).

The Langflow API's websockets endpoints require an [OpenAI API key](https://platform.openai.com/docs/overview) for authentication, and they support an optional [ElevenLabs](https://elevenlabs.io) integration with an ElevenLabs API key.

Additionally, both endpoints require that you provide the flow ID in the endpoint path.

### Voice-to-voice audio streaming

The `/ws/flow_as_tool/$FLOW_ID` endpoint establishes a connection to OpenAI Realtime voice, and then invokes the specified flow as a tool according to the [OpenAI Realtime model](https://platform.openai.com/docs/guides/realtime-conversations#handling-audio-with-websockets).

This approach is ideal for low latency applications, but it is less deterministic because the OpenAI voice-to-voice model determines when to call your flow.

### Speech-to-text audio transcription

The `/ws/flow_tts/$FLOW_ID` endpoint converts audio to text using [OpenAI Realtime voice transcription](https://platform.openai.com/docs/guides/realtime-transcription), and then directly invokes the specified flow for each transcript.

This approach is more deterministic but has higher latency.

This is the mode used in the Langflow **Playground**.

### Session IDs for websockets endpoints

Both endpoints accept an optional `/$SESSION_ID` path parameter to provide a unique ID for the conversation.
If omitted, Langflow uses the flow ID as the [session ID](/session-id).

However, be aware that voice mode only maintains context within the current conversation instance.
When you close the **Playground** or end a chat, verbal chat history is discarded and not available for future chat sessions.

## See also

* [Test flows in the Playground](/concepts-playground)

---

# Document: configuration-cli

_Source: 

---
title: Langflow CLI
slug: /configuration-cli
---


The Langflow command line interface is the main interface for managing and running the Langflow server.

The Langflow CLI is automatically installed when you [install the Langflow package](/get-started-installation).
It isn't available for Langflow Desktop.

## How to use the CLI

The Langflow CLI can be invoked in several ways, depending on your installation method and environment.

The recommended approach is to run the CLI with `uv run` from within a virtual environment where Langflow is installed.

For example, to start Langflow on the default port, run the following command:

    ```bash
    uv run langflow run
    ```

If Langflow is installed globally or added to your PATH, you can execute the CLI directly with `langflow`.

    ```bash
    langflow run
    ```

## Precedence

Langflow CLI options override the values of [environment variables](/environment-variables) set in your terminal or primary `.env` file.

For example, if you have `LANGFLOW_PORT=7860` defined as an environment variable, and you run the CLI with `--port 7880`, then Langflow sets the port to `7880` because the CLI option overrides the environment variable.

This also applies to Boolean environment variables.
For example, if you set `LANGFLOW_REMOVE_API_KEYS=True` in your `.env` file, you can change it to `False` at runtime by running the CLI with `--no-remove-api-keys`.

## Langflow CLI options

All Langflow CLI commands support options that modify the command's behavior or set environment variables.

To set values for options, you can use either of the following syntax styles:

* `--option value`
* `--option=value`

Values with spaces must be surrounded by quotation marks:

* `--option 'Value with Spaces'`
* `--option="Value with Spaces"`

### Boolean options

Boolean options enable and disable settings.
They have a true (enabled) and false (disabled) form:

* Enabled (true): `--option`
* Disabled (false): `--no-option`

The following examples compare Boolean option forms for `REMOVE_API_KEYS`.




`--remove-api-keys` is equivalent to setting `LANGFLOW_REMOVE_API_KEYS=True` in `.env`:

```bash
uv run langflow run --remove-api-keys
```




`--no-remove-api-keys` is equivalent to `LANGFLOW_REMOVE_API_KEYS=False` in `.env`:

```bash
uv run langflow run --no-remove-api-keys
```




In the following command references, default values for Booleans include both the CLI flag and the equivalent Boolean evaluation, such as "`--option` (true)" and "`--no-option` (false)".

### Universal options

The following options are available for all Langflow CLI commands:

* `--version`, `-v`: Show the version and exit.
* `--install-completion`: Install auto-completion for the current shell.
* `--show-completion`: Show the location of the auto-completion config file, if installed.
* `--help`: Print information about command usage, options, and arguments.

## CLI commands

The following sections describe the available CLI commands and any additional options (beyond the [universal options](#universal-options)) available for each command.

### langflow

Running the CLI without any arguments prints a list of available options and commands.


  

```bash
uv run langflow
```

  
  

```bash
langflow
```

  


### langflow api-key {#langflow-api-key}

Creates a Langflow API key.

You must be a superuser to create API keys with the CLI.
For more information, see [Langflow API keys](/api-keys-and-authentication#langflow-api-keys).


  

```bash
uv run langflow api-key
```

  
  

```bash
langflow api-key
```

  


#### Options

| Option | Default | Type | Description |
|--------|---------|--------|-------------|
| `--log-level` | `error` | String | The logging level. One of `debug`, `info`, `warning`, `error`, or `critical`. |

### langflow copy-db

Copies the Langflow database files from the cache directory to the current Langflow installation directory, which is the directory containing `__main__.py`.
You can find the copy target directory by running `which langflow`.

The following files are copied if they exist in the cache directory:

* `langflow.db`: The main Langflow database, stored in the user cache directory
* `langflow-pre.db`: The pre-release database, if it exists


  

```bash
uv run langflow copy-db
```

  
  

```bash
langflow copy-db
```

  


### langflow migration

Manages Langflow database schema changes using [Alembic](https://alembic.sqlalchemy.org/en/latest/), a database migration tool for SQLAlchemy.

The `migration` command has two modes:

* **Test mode (default)**: Checks if migrations can be applied safely without actually running the migrations.
Use this mode to previews the changes that would be made to the database schema before proceeding with the migrations.

* **Fix mode**: Applies the migrations to update the database schema.

    :::warning
    `langflow migration --fix` is a destructive operation that can delete data.
    Always run `langflow migration` first to preview the changes.
    :::


  

1. Run test mode:

  ```bash
  uv run langflow migration
  ```

2. Preview the changes returned by the test to determine if it's safe to proceed with the migration.

3. Run fix mode to apply the changes:

  ```bash
  uv run langflow migration --fix
  ```

  
  

1. Run test mode:

  ```bash
  langflow migration
  ```

2. Preview the changes returned by the test to determine if it's safe to proceed with the migration.

3. Run fix mode to apply the changes:

  ```bash
  langflow migration --fix
  ```

  


### langflow run {#langflow-run}

Starts the Langflow server.


  

```bash
uv run langflow run [OPTIONS]
```

  
  

```bash
langflow run [OPTIONS]
```

  


#### Options

This command supports some common and non-sensitive configuration options for your Langflow server.
Other options must be set in the `.env` or your terminal.
For more information Langflow configuration options, see [Langflow environment variables](/environment-variables).

| Option | Default | Type | Description |
|--------|---------|--------|-------------|
| `--auto-saving` | `--auto-saving` (true) | Boolean | Whether to enable flow auto-saving in the visual editor. Use `--no-auto-saving` to disable flow auto-saving. |
| `--auto-saving-interval` | `1000` | Integer | The interval for flow auto-saving in milliseconds. |
| `--backend-only` | `--no-backend-only` (false) | Boolean | Whether to run Langflow's backend service only (no frontend). Omit or use `--no-backend-only` to start both the frontend and backend. See [Start Langflow in headless mode](#start-langflow-in-headless-mode). |
| `--cache` | `async` | String | The type of [cache storage](/memory) to use. One of `async`, `redis`, `memory`, or `disk`. |
| `--components-path` | Not set | String | The path to the directory containing your custom components. |
| `--dev` | `--no-dev` (false) | Boolean | Whether to run in development mode (may contain bugs). |
| `--env-file` | Not set | String | The path to the `.env` file containing Langflow environment variables. See [Start Langflow with a specific .env file](#start-langflow-with-a-specific-env-file). |
| `--frontend-path` | Not set | String | The path to the frontend directory containing build files. This is only used when [contributing to the Langflow codebase](/contributing-how-to-contribute) or developing a custom Langflow image that includes customized frontend code. |
| `--health-check-max-retries` | `5` | Integer | The maximum number of retries for your Langflow server's health check. |
| `--host` | `localhost` | String | The host on which the Langflow server will run. |
| `--log-file` | `logs/langflow.log` | String | The path to the log file for Langflow. |
| `--log-level` | `critical` | String | The logging level as one of `debug`, `info`, `warning`, `error`, or `critical`. |
| `--log-rotation` | Not set | String | The log rotation interval, either a time duration or file size. |
| `--max-file-size-upload` | `1024` | Integer | The maximum size in megabytes for file uploads. |
| `--open-browser` | `--no-open-browser` (false) | Boolean | Whether to open the system web browser on startup. Use `--open-browser` to open the system's default web browser when Langflow starts. |
| `--port` | `7860` | Integer | The port on which the Langflow server will run. The server automatically selects a free port if the specified port is in use. |
| `--remove-api-keys` | `--no-remove-api-keys` (false) | Boolean | Whether to remove API keys and tokens from flows saved in the Langflow database. |
| `--ssl-cert-file-path` | Not set | String | The path to the SSL certificate file on the local system for SSL-encrypted connections. |
| `--ssl-key-file-path` | Not set | String | The path to the SSL key file on the local system for SSL-encrypted connections. |
| `--worker-timeout` | `300` | Integer | The Langflow server worker timeout in seconds. |
| `--workers` | `1` | Integer | The number of Langflow server worker processes. |

#### Start Langflow with a specific .env file {#start-langflow-with-a-specific-env-file}

The `--env-file` option starts Langflow using the configuration defined in the given `.env` file.
Additional options appended to this command override the values in the `.env` file if there are duplicates.

If `--env-file` is omitted or doesn't include all required variables, Langflow uses the default values for those variables.


  

```bash
uv run langflow run --env-file PATH/TO/LANGFLOW/.env
```

  
  

```bash
langflow run --env-file PATH/TO/LANGFLOW/.env
```

  


#### Start Langflow in headless mode {#start-langflow-in-headless-mode}

The `--backend-only` option starts Langflow's backend service only.
This headless mode has no frontend (visual editor), and you can only access the server programmatically with the Langflow API and CLI.


  

```bash
uv run langflow run --backend-only
```

  
  

```bash
langflow run --backend-only
```

  


### langflow superuser {#langflow-superuser}

Creates a superuser account with the given username and password.


  

```bash
uv run langflow superuser --username [NAME] --password [PASSWORD] [OPTIONS]
```

  
  

```bash
langflow superuser --username [NAME] --password [PASSWORD] [OPTIONS]
```

  


#### Options

| Option | Default | Type | Description |
|--------|---------|--------|-------------|
| `--log-level` | `error` | String | The logging level. One of `debug`, `info`, `warning`, `error`, or `critical`. |

For this command, `--username` and `--password` aren't optional, and they have no default value.
The command fails if you don't provide these arguments.
For more information, see [`LANGFLOW_SUPERUSER` and `LANGFLOW_SUPERUSER_PASSWORD`](/api-keys-and-authentication#langflow-superuser).

#### Disable CLI superuser creation

The `langflow superuser` command is controlled by the [`LANGFLOW_ENABLE_SUPERUSER_CLI`](/api-keys-and-authentication#langflow-enable-superuser-cli) environment variable:

* **`LANGFLOW_ENABLE_SUPERUSER_CLI=True` (default)**: The `langflow superuser` command is available, and superuser creation is unrestricted.
* **`LANGFLOW_ENABLE_SUPERUSER_CLI=False` (recommended)**: Disables the `langflow superuser` command.
For security reasons, this is recommended to prevent unauthorized superuser creation, especially in production environments.

To disable the `langflow superuser` command, you must set `LANGFLOW_ENABLE_SUPERUSER_CLI=False` in your Langflow `.env` file, and then [start Langflow with your `.env` file](#start-langflow-with-a-specific-env-file).

---

# Document: configuration-custom-database

_Source: 

---
title: Configure an external PostgreSQL database
slug: /configuration-custom-database
---

Langflow's default database is [SQLite](https://www.sqlite.org/docs.html), but you can configure Langflow to use PostgreSQL instead.

This guide walks you through setting up an external database for Langflow by replacing the default SQLite connection string `sqlite:///./langflow.db` with PostgreSQL, both in local and containerized environments.

In this configuration, all structured application data from Langflow, including flows, message history, and logs, is instead managed by PostgreSQL.
PostgreSQL is better suited for production environments due to its robust support for concurrent users, advanced data integrity features, and scalability.
Langflow can more efficiently handle multiple users and larger workloads by using PostgreSQL as the database.

## Prerequisites

- A [PostgreSQL](https://www.pgadmin.org/download/) database version 15 or later

## Connect Langflow to a local PostgreSQL database

1. If Langflow is running, stop Langflow with <kbd>Ctrl+C</kbd>.

2. Find your PostgreSQL database's connection string in the format `postgresql://user:password@host:port/dbname`.

    The hostname in your connection string depends on how you're running PostgreSQL:

    - If you're running PostgreSQL directly on your machine, use `localhost`.
    - If you're running PostgreSQL in Docker Compose, use the service name, such as `postgres`.
    - If you're running PostgreSQL in a separate Docker container with `docker run`, use the container's IP address or network alias.
    - If you're running a cloud-hosted PostgreSQL, your provider will share your connection string, which includes a username and password.

3. Edit or create a Langflow `.env` file:

    ```
    touch .env
    ```

    You can use the [`.env.example`](https://github.com/langflow-ai/langflow/blob/main/.env.example) file in the Langflow repository as a template for your own `.env` file.

4. In your `.env` file, set `LANGFLOW_DATABASE_URL` to your PostgreSQL connection string:

    ```text
    LANGFLOW_DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
    ```

    Langflow uses [SQLAlchemy](https://www.sqlalchemy.org/) with the [psycopg](https://www.psycopg.org/) driver to pass SSL parameters directly to the PostgreSQL connection.

    :::warning PostgreSQL driver compatibility
    Langflow requires `psycopg2-binary` or `psycopg[binary]` as the PostgreSQL driver. The `asyncpg` driver is not compatible with Langflow's current database schema due to stricter timezone handling requirements.
    :::

    The following SSL modes are supported:

    - **`sslmode=require`**: Requires SSL connection but doesn't verify server certificate. This option is the least secure, but acceptable for most use cases.
        ```bash
        LANGFLOW_DATABASE_URL="postgresql://user:password@localhost:5432/dbname?sslmode=require"
        ```

    - **`sslmode=verify-ca`**: Requires SSL and verifies the server certificate against the Certificate Authority (CA). Add the certificate paths to your connection string:
        ```bash
        LANGFLOW_DATABASE_URL="postgresql://user@localhost:5432/dbname?sslmode=verify-ca&sslcert=/path/to/client.crt&sslkey=/path/to/client.key&sslrootcert=/path/to/ca.crt"
        ```

    - **`sslmode=verify-full`**: Requires SSL, verifies the server certificate, and checks the request hostname against the certificate hostname. The `db.example.com` hostname in this example must match the server certificate's CN. This option is the most secure.
        ```bash
        LANGFLOW_DATABASE_URL="postgresql://user@db.example.com:5432/dbname?sslmode=verify-full&sslcert=/path/to/client.crt&sslkey=/path/to/client.key&sslrootcert=/path/to/ca.crt"
        ```

        Do not use the Langflow environment variables [`LANGFLOW_SSL_CERT_FILE`](/environment-variables#server) and [`LANGFLOW_SSL_KEY_FILE`](/environment-variables#server) for your PostgreSQL certificates: these variables are for enabling HTTPS on the Langflow server, not for PostgreSQL database connections.

        For more on managing SSL certificates in PostgreSQL, see the [PostgreSQL documentation](https://www.postgresql.org/docs/9.1/ssl-tcp.html).

5. Save your changes, and then start Langflow with your `.env` file:

    ```bash
    uv run langflow run --env-file .env
    ```

    For optional connection pooling and timeout settings, see [Configure external memory](/memory#configure-external-memory).

6. In Langflow, run any flow to create traffic.

7. Inspect your PostgreSQL database's tables and activity to verify that new tables and traffic were created after you ran a flow.

## Deploy Langflow and PostgreSQL containers with docker-compose.yml

Launching Langflow and PostgreSQL containers in the same Docker network ensures proper connectivity between services.
For an example, see the [`docker-compose.yml`](https://github.com/langflow-ai/langflow/blob/main/docker_example/docker-compose.yml) file in the Langflow repository.

The configuration in the example `docker-compose.yml` also sets up persistent volumes for both Langflow and PostgreSQL data.
Persistent volumes map directories inside of containers to storage on the host machine, so data persists through container restarts.

Docker Compose creates an isolated network for all services defined in `docker-compose.yml`. This ensures that the services can communicate with each other using their service names as hostnames, such as `postgres` in the database URL.
In contrast, if you run PostgreSQL separately with `docker run`, it launches in a different network than the Langflow container, and this prevents Langflow from connecting to PostgreSQL using the service name.

To start the Langflow and PostgreSQL services with the example Docker Compose file, navigate to the `langflow/docker_example` directory, and then run `docker-compose up`.
If you're using a different `docker-compose.yml` file, run the `docker-compose up` command from the same directory as your `docker-compose.yml` file.

## Deploy multiple Langflow instances with a shared PostgreSQL database

To configure multiple Langflow instances that share the same PostgreSQL database, modify your `docker-compose.yml` file to include multiple Langflow services.

This example populates the values in `docker-compose.yml` with values from your Langflow `.env` file.
This approach means you only have to manage deployment variables in one file, instead of copying values across multiple files.

1. Update your `.env` file with values for your PostgreSQL database:

    ```text
    POSTGRES_USER=langflow
    POSTGRES_PASSWORD=your_secure_password
    POSTGRES_DB=langflow
    POSTGRES_HOST=postgres
    POSTGRES_PORT=5432
    LANGFLOW_CONFIG_DIR=app/langflow
    LANGFLOW_PORT_1=7860
    LANGFLOW_PORT_2=7861
    LANGFLOW_HOST=0.0.0.0
    ```

    For optional connection pooling and timeout settings, see [Configure external memory](/memory#configure-external-memory).

2. Reference these variables in your `docker-compose.yml`.
For example:

    ```yaml
    services:
      postgres:
        image: postgres:16
        environment:
          - POSTGRES_USER=${POSTGRES_USER}
          - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
          - POSTGRES_DB=${POSTGRES_DB}
        ports:
          - "${POSTGRES_PORT}:5432"
        volumes:
          - langflow-postgres:/var/lib/postgresql/data

      langflow-1:
        image: langflowai/langflow:latest
        pull_policy: always
        ports:
          - "${LANGFLOW_PORT_1}:7860"
        depends_on:
          - postgres
        environment:
          - LANGFLOW_DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}
          - LANGFLOW_CONFIG_DIR=${LANGFLOW_CONFIG_DIR}
          - LANGFLOW_HOST=${LANGFLOW_HOST}
          - PORT=7860
        volumes:
          - langflow-data-1:/app/langflow

      langflow-2:
        image: langflowai/langflow:latest
        pull_policy: always
        ports:
          - "${LANGFLOW_PORT_2}:7860"
        depends_on:
          - postgres
        environment:
          - LANGFLOW_DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}
          - LANGFLOW_CONFIG_DIR=${LANGFLOW_CONFIG_DIR}
          - LANGFLOW_HOST=${LANGFLOW_HOST}
          - PORT=7860
        volumes:
          - langflow-data-2:/app/langflow

    volumes:
      langflow-postgres:
      langflow-data-1:
      langflow-data-2:
    ```

3. Deploy the file with `docker-compose up`.
You can access the first Langflow instance at `http://localhost:7860`, and the second Langflow instance at `http://localhost:7861`.

4. To confirm both instances are using the same database, run the `docker exec` command to start `psql` in your PostgreSQL container.
Your container name may vary.

    ```bash
    docker exec -it docker-test-postgres-1 psql -U langflow -d langflow
    ```

5. Query the database for active connections:

    ```sql
    langflow=# SELECT * FROM pg_stat_activity WHERE datname = 'langflow';
    ```

6. Examine the query results for multiple connections with different `client_addr` values, for example `172.21.0.3` and `172.21.0.4`.
Since each Langflow instance runs in its own container on the Docker network, using different incoming IP addresses confirms that both instances are actively connected to the PostgreSQL database.

7. To quit `psql`, type `quit`.

## See also

* [Langflow database guide for enterprise DBAs](/enterprise-database-guide)
* [Memory management options](/memory)
* [Logs](/logging)

---

# Document: configuration-global-variables

_Source: 

---
title: Global variables
slug: /configuration-global-variables
---


Use global variables to store and reuse credentials and generic values across all of your flows.
Global variables are typically used by components in flow, and you can use them in any field with the  global variable icon.

In contrast, [environment variables](/environment-variables), like `LANGFLOW_PORT` or `LANGFLOW_LOG_LEVEL`, are generally for broader settings that configure how Langflow runs.
However, Langflow can also source global variables from environment variables.

Langflow stores global variables in its internal database, and it encrypts the values using a secret key.

## Create a global variable

To create a new global variable, follow these steps.

1. In the Langflow header, click your profile icon, and then select **Settings**.
2. Click **Global Variables**.

3. Click **Add New**.

4. In the **Create Variable** dialog, enter a name for your variable in the **Variable Name** field.

5. Optional: Select a **Type** for your global variable. The available types are **Generic** (default) and **Credential**.

   Langflow encrypts both **Generic** and **Credential** type global variables.
   However, **Generic** variables aren't masked in the visual editor, whereas **Credential** variables are masked.
   **Session ID** fields don't accept **Credential** (masked) variables.

6. Enter the **Value** for your global variable.

7. Optional: Use the **Apply To Fields** menu to select one or more fields that you want Langflow to automatically apply your global variable to. For example, if you select **OpenAI API Key**, Langflow automatically applies the variable to any **OpenAI API Key** field.

8. Click **Save Variable**.

You can now select your global variable from any text input field that displays the  **Globe** icon.

## Edit a global variable

1. In the Langflow header, click your profile icon, and then select **Settings**.

2. Click **Global Variables**.

3. Click on the global variable you want to edit.

4. In the **Update Variable** dialog, you can edit the following fields: **Variable Name**, **Value**, and **Apply To Fields**.

5. Click **Update Variable**.

## Delete a global variable

Deleting a global variable permanently deletes the value from the database.
Flows that reference the deleted global variable will fail.

1. In the Langflow header, click your profile icon, and then select **Settings**.

2. Click **Global Variables**.

3. Click the checkbox next to the global variable that you want to delete.

4. Click  **Delete**.

The global variable is deleted from the database.

## Add custom global variables from the environment {#add-custom-global-variables-from-the-environment}

Langflow can source custom global variables from your runtime environment.
For information about how Langflow detects and applies environment variables, see [Langflow environment variables](/environment-variables).

Langflow automatically generates global variables based on [`constants.py`](https://github.com/langflow-ai/langflow/blob/main/src/lfx/src/lfx/services/settings/constants.py) if it detects any matching environment variables.
For example, if you set `OPENAI_API_KEY` in your runtime environment, Langflow automatically generates a global variable using that value.

You can declare additional variables in `LANGFLOW_VARIABLES_TO_GET_FROM_ENVIRONMENT`.
For example, `LANGFLOW_VARIABLES_TO_GET_FROM_ENVIRONMENT=WATSONX_PROJECT_ID,WATSONX_API_KEY` creates global variables named `WATSONX_PROJECT_ID` and `WATSONX_API_KEY` in Langflow's database.
Then, you can use these variables wherever they are needed in your component settings.




If you installed Langflow locally, set `LANGFLOW_VARIABLES_TO_GET_FROM_ENVIRONMENT` in your Langflow `.env` file:

1. Create or edit your Langflow `.env` file.

2. Add the `LANGFLOW_VARIABLES_TO_GET_FROM_ENVIRONMENT` environment variable as follows:

   You can specify the variables either as a comma-separated string with no spaces, or as a JSON list:

   ```text
   # Option 1: Comma-separated string (no spaces)
   LANGFLOW_VARIABLES_TO_GET_FROM_ENVIRONMENT=VARIABLE1,VARIABLE2

   # Option 2: JSON list format
   LANGFLOW_VARIABLES_TO_GET_FROM_ENVIRONMENT=["VARIABLE1", "VARIABLE2"]
   ```

   Replace `VARIABLE1,VARIABLE2` with your additional variables that you want Langflow to source from the environment, such as `CUSTOM_API_KEY,INTERNAL_SERVICE_URL` or `["CUSTOM_API_KEY", "INTERNAL_SERVICE_URL"]`.

3. Save and close the file.

4. Start Langflow with the `.env` file:

   ```bash
   uv run langflow run --env-file .env
   ```

   Alternatively, you can set environment variables directly in the command line:

   ```bash
   VARIABLE1="VALUE1" VARIABLE2="VALUE2" uv run langflow run --env-file .env
   ```

   The command-line variables override matching variables in the `.env` file.
   Expose your environment variables to Langflow in a manner that best suits your own environment.

5. Confirm that Langflow successfully sourced the global variables from the environment:

   1. In the Langflow header, click your profile icon, and then select **Settings**.

   2. Click **Global Variables**, and then make sure that your environment variables appear in the **Global Variables** list.




If you're using Docker, there are two ways that you can set `LANGFLOW_VARIABLES_TO_GET_FROM_ENVIRONMENT`:

* On the command line:

   ```bash
   docker run -it --rm \
      -p 7860:7860 \
      -e LANGFLOW_VARIABLES_TO_GET_FROM_ENVIRONMENT="VARIABLE1,VARIABLE2" \
      -e VARIABLE1="VALUE1" \
      -e VARIABLE2="VALUE2" \
      langflowai/langflow:latest
   ```

* In your `.env` file:

   ```bash
   docker run -it --rm \
      -p 7860:7860 \
      --env-file .env \
      -e VARIABLE1="VALUE1" \
      -e VARIABLE2="VALUE2" \
      langflowai/langflow:latest
   ```

The list in `LANGFLOW_VARIABLES_TO_GET_FROM_ENVIRONMENT` includes only the variable names.
You must ensure that these environment variables are defined in your Docker environment, such as with `-e` or otherwise.




After starting Langflow, go to your Langflow **Settings** to confirm that the variables were created.

Only the **Name** and **Value** are taken from the environment.
You can edit the variables in your Langflow **Settings** if you want to configure additional options, such as the **Apply To Fields** option.

Global variables sourced from the environment are assigned the **Credential** type, which masks the values in the visual editor.
However, Langflow automatically encrypts _all_ global variables stored in the database.

## Disallow global variables from the environment

If you want to explicitly prevent Langflow from sourcing global variables from the environment, set `LANGFLOW_STORE_ENVIRONMENT_VARIABLES=False` in your `.env` file.

## Use environment variables for missing global variables {#use-environment-variables-for-missing-global-variables}

If you want to automatically set fallback values for your global variables to environment variables, set `LANGFLOW_FALLBACK_TO_ENV_VAR=True` in your `.env` file.
When this setting is enabled, if a global variable isn't found, Langflow attempts to use an environment variable with the same name as a backup.

For example, assume you have the following Langflow `.env` configuration, and your flow has a component that expects a `WATSONX_API_KEY` global variable:

```text
LANGFLOW_FALLBACK_TO_ENV_VAR=True
WATSONX_PROJECT_ID=your_project_id
WATSONX_API_KEY=your_api_key
```

When you run the flow, if there is no global variable named `WATSONX_API_KEY`, Langflow looks for an environment variable named `WATSONX_API_KEY`.
In this example, Langflow uses the `WATSONX_API_KEY` value from the `.env` to run the flow.

---

# Document: contributing-telemetry

_Source: 

---
title: Telemetry
slug: /contributing-telemetry
---

Langflow uses anonymous telemetry to collect statistics about feature usage and performance.
The Langflow team uses this data to identify popular features and areas that need improvement based on actual usage patterns.
This helps prioritize development efforts on the most impactful changes and popular features.

## Privacy

The Langflow team respects your privacy, and the team is committed to protecting your data.

Langflow telemetry doesn't collect any personal information or sensitive data.
All telemetry data is anonymized and used solely for improving Langflow.

## Opt out of telemetry

To opt out of telemetry, set `DO_NOT_TRACK=True` in your [Langflow environment variables](/environment-variables) before starting Langflow. This disables telemetry data collection.

## Data that Langflow collects

Langflow telemetry collects data on flow runs, your environment, and component usage.

### Run

This telemetry event is sent every time a flow is executed.

- **IsWebhook**: Indicates whether the operation was triggered with a webhook.
- **Seconds**: Duration in seconds for how long the operation lasted, providing insights into performance.
- **Success**: Boolean value indicating whether the operation was successful, helping identify potential errors or issues.
- **ErrorMessage**: Provides error message details if the operation was unsuccessful, aiding in troubleshooting and enhancements.

### Shutdown

This telemetry event captures information about application lifecycle and runtime duration.

- **TimeRunning**: Total runtime before shutdown, which is useful for understanding the application lifecycle and optimizing uptime.

### Version

This telemetry event is sent once when the telemetry service starts.

- **Version**: The specific version of Langflow used, which helps in tracking feature adoption and compatibility.
- **Platform**: Operating system of the host machine, which helps determine the most popular platforms for development and testing efforts.
- **Python**: The version of Python used, assisting in maintaining compatibility and support for various Python versions.
- **Arch**: Architecture of the system, such as x86 or ARM, which helps prioritize hardware optimization and testing in the Langflow codebase.
- **AutoLogin**: Indicates whether the auto-login feature is enabled, reflecting user preference settings.
- **CacheType**: Type of caching mechanism used, which impacts performance and efficiency.
- **BackendOnly**: Boolean indicating whether Langflow is running in backend-only mode, useful for understanding deployment configurations.
- **Desktop**: Indicates whether Langflow is running in desktop mode (Langflow Desktop), helping to understand usage patterns across different deployment types.

### Email

This telemetry event is sent to track registered email addresses for Langflow Desktop. The event is triggered in two cases:

* Every time a new email address is registered through the POST `/api/v2/registration/` endpoint.
* Each time you start Langflow Desktop _after_ an email address is registered.

   The first time you start Langflow Desktop and register your email address, the event is reported by the call to the POST `/api/v2/registration/` endpoint.

This telemetry event includes the following information:

- **Email**: The registered email address, which helps track user registrations and facilitate an understanding of the Langflow Desktop user base.
- **ClientType**: Indicates the client type, which can be "desktop" or "oss".

If telemetry is disabled with the `DO_NOT_TRACK` environment variable in Langflow Desktop, you are still prompted to enter your email address, but the email address is stored in your local Langflow database only.

### Playground

This telemetry event monitors performance and usage patterns in the **Playground** environment.

- **Seconds**: Duration in seconds for **Playground** execution, offering insights into performance during testing or experimental stages.
- **ComponentCount**: Number of components used in the **Playground**, which helps understand complexity and usage patterns.
- **Success**: Success status of the **Playground** operation, aiding in identifying the stability of experimental features.

### Component

This telemetry event is sent for each component execution.

- **Name**: Identifies the component, providing data on which components are most utilized or prone to issues.
- **Seconds**: Time taken by the component to execute, offering performance metrics.
- **Success**: Whether the component operated successfully, which helps in quality control.
- **ErrorMessage**: Details of any errors encountered, crucial for debugging and improvement.

### Exception

This telemetry event is sent when an unhandled exception is captured by Langflow's lifecycle or global exception handler.

- **Type**: The exception class name, such as `ValueError`.
- **Message**: The exception message that was raised.
- **Context**: Additional contextual information related to where the exception occurred, such as route, component, or operation details, when available.
- **StackTraceHash**: A hash of the stack trace used to group similar exceptions for easier analysis.

---

# Document: data-types

_Source: 

---
title: Langflow data types
slug: /data-types
---


Langflow components are designed to accept and produce specific types of inputs and outputs.
Input and output data types define the structure and flow of information between components.
Understanding these structures helps you build applications that provide valid input and correctly anticipate the output format.

[Component ports](/concepts-components#component-ports) represent the data types that each component can send and receive.
Some data types are self-evident from the fields they are attached to; for example, a **System Message** field accepts [message data](#message).
[Port colors](/concepts-components#port-colors) also indicate the port's data type.
For example **JSON** ports, represented by , either accept or emit [structured data objects](#json).

When building flows, connect output ports to input ports of the same type (color) to transfer that type of data between two components.

:::tip
* In the [workspace](/concepts-overview#workspace), hover over a port to see connection details for that port.
Click a port to  **Search** for compatible components.

* If two components have incompatible data types, you can use a processing component like the [**Type Convert** component](/type-convert) to convert the data between components.
:::

## JSON

:::tip
In Langflow version 1.9.0, the `Data` type and port were renamed to `JSON`.
Flows using `Data` are backwards compatible.
:::

**JSON** ports  accept or produce the `JSON` type, which is a structured data object, like a JSON payload that you might send to an API.
This data type is used to pass key-value pairs between components, such as user profiles, settings, or other structured information.

`JSON` objects include a primary text field, indicated by a `text_key`, and additional metadata.

### Schema and attributes

The schema is defined in [`data.py`](https://github.com/langflow-ai/langflow/blob/main/src/lfx/src/lfx/schema/data.py).

The following attributes are available:

- `data`: A `JSON` object stores key-value pairs within the `.data` attribute. This is the `JSON` object's core dictionary. Each key is a field name, and the values can be any supported data type.
- `text_key`: The key in `data` that is considered the primary text value.
- `default_value`: Fallback if `text_key` is missing. The default `text_key` is `"text"`.

```python
data_obj = JSON(
    text_key="text",
    data={
        "text": "Hello world",
        "name": "Charlie",
        "age": 28
    },
    default_value=""
)
```

`JSON` objects can be serialized to JSON, created from JSON, or created from other dictionary data.
However, the resulting `JSON` object is a structured object with validation and methods, not a plain dictionary.
For example, when serialized into JSON, the previous Python example becomes the following JSON object:

```json
{
  "text_key": "text",
  "data": {
    "text": "Hello world",
    "name": "Charlie",
    "age": 28
  },
  "default_value": ""
}
```

## Table

:::tip
In Langflow version 1.9.0, the `DataFrame` type and port were renamed to `Table`.
Flows using `DataFrame` are backwards compatible.
:::

**Table** ports  accept or produce [pandas DataFrames](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.html), which are similar to tabular CSV data.

Use the `Table` type to work with data containing multiple rows or records.

### Schema and attributes

The schema is defined in [`dataframe.py`](https://github.com/langflow-ai/langflow/blob/main/src/lfx/src/lfx/schema/dataframe.py).

The following attributes are available:

- **Full pandas compatibility**: All pandas DataFrame methods and functionality are supported

- **Langflow integration**: Accepts lists of [`JSON` objects](#json), dictionaries, or existing DataFrames.

- **Convenience methods**:
   - `to_data_list()`
   - `add_row()`
   - `add_rows()`
   - `to_lc_documents()`
   - `to_data()`
   - `to_message()`

- **Text key support**: Maintains `text_key` and `default_value` attributes for [`JSON` object](#json) compatibility.

### Table structure

A Table has a tabular data structure with rows and columns.
Keys are columns, and each object in the array is a row.

```json
[
  {
    "name": "Charlie Lastname",
    "age": 28,
    "email": "charlie.lastname@example.com"
  },
  {
    "name": "Alexandra Example",
    "age": 34,
    "email": "alexandra@example.com"
  }
]
```

When represented as tabular data, the preceding Table object is structured as follows:

```text
| name | age | email |
|------|-----|-------|
| Charlie Lastname | 28 | charlie.lastname@example.com |
| Alexandra Example | 34 | alexandra@example.com |
```

## Embeddings

**Embeddings** ports  emit or ingest vector embeddings to support functions like similarity search.

The `Embeddings` data type is used specifically by components that either produce or consume vector embeddings, such as the [embedding model components](/components-embedding-models) and vector store components.

For example, embedding model components output `Embeddings` data that you can connect to an **Embedding** input port on a vector store component.

For information about the underlying Python classes that produce `Embeddings`, see the [LangChain Embedding models documentation](https://docs.langchain.com/oss/python/integrations/text_embedding).

## LanguageModel

The `LanguageModel` type is a specific data type that can be produced by language model components and accepted by components that use an LLM.

When you change a language model component's output type from **Model Response** to **Language Model**, the component's output port changes from a **Message** port to a **Language Model** port .
Then, you connect the outgoing **Language Model** port to a **Language Model** input port on a compatible component, such as a **Smart Transform** component.

For more information about using these components in flows and toggling `LanguageModel` output, see [Language model components](/components-models#language-model-output-types).

<details>
<summary>LanguageModel is an instance of LangChain ChatModel</summary>

Because Langflow is built on LangChain, `LanguageModel` is actually an instance of a [LangChain chat model](https://docs.langchain.com/oss/python/integrations/chat) that uses the configuration parameters set in the originating component.

Often, components produce an instance of an integrated chat model that is designed to support the specific model provider, such as [`ChatOpenAI`](https://docs.langchain.com/oss/python/integrations/chat/openai) or [`ChatAnthropic`](https://docs.langchain.com/oss/python/integrations/chat/anthropic).

You can inspect the [component code](/concepts-components#component-code) to see the specific `Chat` instance it produces.

</details>

## Memory

**Memory** ports  are used to integrate a **Message History** component with external chat memory storage.

For more information, see the [**Message History** component](/message-history).

## Message

**Message** ports  accept or produce `Message` data, which extends the [`JSON` type](#json) with additional fields and methods for text input typically used in chat flows.

This data type is used by many components.

:::tip
Components that accept or produce `Message` data may not include all attributes in the incoming or outgoing `Message` data.
As long as the data is compatible with the `Message` schema, it can be valid.

When building flows, focus on the fields shown on each component in the workspace, rather than the data types passed between components.
The details of a particular data type are often only relevant when you are debugging a flow or component that isn't producing the expected output.

For example, a **Chat Input** component only requires the content of the **Input Text** (`input_value`) field.
The component then constructs a complete `Message` object before passing the data to other components in the flow.
:::

### Schema, structure, and attributes

The `Message` schema is defined in [`message.py`](https://github.com/langflow-ai/langflow/blob/main/src/lfx/src/lfx/schema/message.py).
Some `Message` attributes have their own schema definitions, such as [`content_block.py`](https://github.com/langflow-ai/langflow/blob/main/src/backend/base/langflow/schema/content_block.py).

`Message` data is structured as a JSON object.
For example:

```json
{
  "text": "Name: Charlie Lastname, Age: 28, Email: charlie.lastname@example.com",
  "sender": "User",
  "sender_name": "Charlie Lastname",
  "session_id": "some-session-id",
  "timestamp": "2024-06-01T12:00:00Z",
  "files": [],
  "content_blocks": [],
  "category": "message"
}
```

The attributes included in a specific `Message` object depend on the context, including the component type, flow activity, and whether the message is a query or response.
Some common attributes include the following:

- `text`: The main message content.
- `sender`: Identifies the originator of a chat message as either `User` or `Language Model`.
- `sender_name`: The display name for the sender. Defaults to `User` or `Language Model`.
- `session_id`: The chat [session identifier](/session-id).
- `flow_id`: The ID of the flow that the message is associated with. `flow_id` and `session_id` are the same if the flow doesn't use custom session IDs.
- `timestamp`: The UTC timestamp that the message was sent.
- `files`: A list of file paths or images included with the message
- `content_blocks`: Container for rich content input, such as text, media, or code. Also contains error message information if the LLM can't process the input.
- `category`: `"message"`, `"error"`, `"warning"`, or `"info"`.

Not all attributes are required, and some components accept message-compatible input, such as raw text input.
The strictness depends on the component.

### Message data in Input and Output components

In flows with [**Chat Input and Output** components](/chat-input-and-output), `Message` data provides a consistent structure for chat interactions, and it is ideal for chatbots, conversational analysis, and other use cases based on a dialogue with an LLM or agent.
In these flows, the **Playground** chat interface prints only the `Message` attributes that are relevant to the conversation, such as `text`, `files`, and error messages from `content_blocks`.
To see all `Message` attributes, inspect the message logs in the **Playground**.

In flows with [**Text Input and Output** components](/text-input-and-output), `Message` data is used to pass simple text strings without the chat-related metadata.
These components handle `Message` data as independent text strings, not as part of an ongoing conversation.
For this reason, a flow with only **Text Input and Output** components isn't compatible with the **Playground**.
For more information, see [Text input and output components](/text-input-and-output).

When using the Langflow API, the response includes the `Message` object along with other response data from the flow run.
Langflow API responses can be extremely verbose, so your applications must include code to extract relevant data from the response to return to the user.
For an example, see the [Langflow quickstart](/get-started-quickstart).

Additionally, input sent to the input port of input/output components does _not_ need to be a complete `Message` object because the component constructs the `Message` object that is then passed to other components in the flow or returned as flow output.
In fact, some components shouldn't receive a complete `Message` object because some attributes, like `timestamp` should be added by the component for accuracy.

## Tool

**Tool** ports  connect tools to an **Agent** component.

Tools can be other components where you enabled **Tool Mode**, they can be the dedicated **MCP Tools** component, or they can be other components that only support **Tool Mode**.
Multiple tools can be connected to the same **Agent** component at the same port.

Functionally, `Tool` data is a LangChain `StructuredTool` object that can be used in agent flows.

For more information, see [Configure tools for agents](/agents-tools) and [Use Langflow as an MCP client](/mcp-client).

## Unknown or multiple types

If a port can accept or produce multiple data types, it is represented by the gray port icon .

Hover over the port to see the accepted or produced data types.

## View data types in flows

In Langflow, you can use  **Inspect output** to view the output of individual components.
This can help you learn about the different data type and debug problems with invalid or malformed inputs and output.

The following example shows how to inspect the output of a [**Type Convert** component](/type-convert), which can convert data from one type to another:

1. Create a flow, and then connect a **Chat Input** component to a **Type Convert** component.

2. In the **Chat Input** component, enter some text for the type converter to process.

3. On the **Type Convert** component, click  **Run component**, and then click  **Inspect output**.

    The default output is `Message` data, which is the same as the input coming from the **Chat Input** component.
    To see the `Message` data converted to `JSON` or `Table`, change the **Output Type** on the **Type Convert** component, and then rerun the component.

    
    

    ```text
    Input text
    ```

    
    

    ```json
    {
      "timestamp": "2025-07-15 20:56:20 UTC",
      "sender": "User",
      "sender_name": "User",
      "session_id": "a0c7e888-4fd6-4242-b8c8-e761ad690aeb",
      "text": "",
      "files": [],
      "error": false,
      "edit": false,
      "properties": {
        "text_color": "",
        "background_color": "",
        "edited": false,
        "source": {
          "id": null,
          "display_name": null,
          "source": null
        },
        "icon": "",
        "allow_markdown": false,
        "positive_feedback": null,
        "state": "complete",
        "targets": []
      },
      "category": "message",
      "content_blocks": [],
      "id": "9da72da2-efbb-4ccd-90ad-b32429b0418e",
      "flow_id": "a0c7e888-4fd6-4242-b8c8-e761ad690aeb",
      "duration": null
    }
    ```

    
    

    ```text
    | Field | Value |
    |-------|-------|
    | timestamp | 2025-07-15 20:56:11 UTC |
    | sender | User |
    | sender_name | User |
    | session_id | a0c7e888-4fd6-4242-b8c8-e761ad690aeb |
    | text | (empty) |
    | files | [] |
    | error | False |
    | edit | False |
    | properties | text_color: '', background_color: '', edited: False, source: {id: None, display_name: None, source: None}, icon: '', allow_markdown: False, positive_feedback: None, state: 'complete', targets: [] |
    | category | message |
    | content_blocks | [] |
    | id | 341686eb-7a39-4b80-a90a-d8bf267815ef |
    | flow_id | a0c7e888-4fd6-4242-b8c8-e761ad690aeb |
    | duration | (empty) |
    ```

    
    

## See also

- [Custom components](/components-custom-components)
- [Pydantic Models](https://docs.pydantic.dev/latest/api/base_model/)
- [pandas.DataFrame](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.html)

---

# Document: enterprise-database-guide

_Source: 

---
title: Langflow database guide for enterprise DBAs
slug: /enterprise-database-guide
---


The Langflow database stores data that is essential for more Langflow operations, including startup, flow execution, user interactions, and administrative tasks.
The database supports both frontend (visual editor) and backend (API) operations, making its availability critical to Langflow's stability and functionality.
For details about the database schema, see [Memory management options](/memory).

This guide is designed for enterprise database administrators (DBAs) and operators responsible for deploying and managing Langflow in production environments.
It explains how to configure Langflow to use PostgreSQL, including high availability (HA) and active-active configurations, as well as best practices for monitoring, maintenance, and security.

## Configure Langflow with PostgreSQL

Langflow's default database is SQLite.
However, PostgreSQL is recommended for production deployments due to its scalability, performance, and robustness.

The following steps explain how to configure Langflow to use PostgreSQL for a standalone or containerized deployment.
For more information, see [Configure an external PostgreSQL database](/configuration-custom-database).

1. Set up PostgreSQL:

   1. Deploy a PostgreSQL instance (version 15 or later) using a local server, Docker, or a managed cloud service.
   2. Create a database for Langflow.
   3. Create a PostgreSQL user with appropriate, minimal permissions to manage and write to the database, such as CREATE, SELECT, INSERT, UPDATE, DELETE on your Langflow tables.

2. Obtain the connection string in the format `postgresql://user:password@host:port/dbname`, such as`postgresql://langflow:securepassword@postgres:5432/langflow`.

    For High Availability, use the virtual IP or proxy hostname instead of the direct database host.
    For more information, see [High Availability for PostgreSQL](#high-availability-for-postgresql).

3. Configure Langflow with the `.env` or `docker-compose.yml` files.

    
    

    1. Create a `.env` file in the `langflow` directory:

        ```shell
        touch .env
        ```

    2. Add the connection string to the `.env` file:

        ```text
        LANGFLOW_DATABASE_URL="postgresql://langflow:securepassword@postgres:5432/langflow"
        ```

    For more environment variables, see the `.env.example` file in the Langflow repository.

    
    

    Use the sample `docker-compose.yml` from the Langflow Repository.
    You can use the default values or customize them as needed.

    ```yaml
    version: '3'
    services:
      langflow:
        image: langflowai/langflow:latest
        ports:
          - "7860:7860"
        environment:
          - LANGFLOW_DATABASE_URL=postgresql://langflow:langflow@postgres:5432/langflow
      postgres:
        image: postgres:16
        ports:
          - "5432:5432"
        environment:
          - POSTGRES_USER=langflow
          - POSTGRES_PASSWORD=langflow
          - POSTGRES_DB=langflow
        volumes:
          - langflow-postgres:/var/lib/postgresql/data
    volumes:
      - langflow-postgres:
    ```

    
    


4. Start Langflow with your PostgreSQL connection:

    
      

      ```shell
      uv run langflow run --env-file .env
      ```

      
      

      Navigate to the directory containing `docker-compose.yml`, and then run `docker-compose up`.

      
    

5. Optional: Run migrations.

    Langflow uses migrations to manage its database schema.
    When you first connect to PostgreSQL, Langflow automatically runs migrations to create the necessary tables.

    Direct schema modification can cause conflicts with Langflow's built-in schema management.
    If you need to update the schema, you can manually run migrations with the Langflow CLI:

    1. Run `langflow migration` to preview the changes.

    2. Review the changes to ensure that it's safe to proceed with the migration.

    3. Run `langflow migration --fix` to run the migration and permanently apply the changes.

        This is a destructive operation that can delete data.
        For more information, see [`langflow migration`](/configuration-cli#langflow-migration).

6. To verify the configuration, create any flow using the Langflow visual editor or API, and then query your database to confirm the tables and activity are recorded there. The content of the flow doesn't matter; you only need to confirm that the flow is stored in your PostgreSQL database.
You can query the database in two ways:

    * Query the database container:

        ```
        docker exec -it <postgres-container> psql -U langflow -d langflow
        ```

    * Use SQL:

        ```
        SELECT * FROM pg_stat_activity WHERE datname = 'langflow';
        ```

### High Availability for PostgreSQL {#high-availability-for-postgresql}

To further improve performance, reliability, and scalability, use a High Availability (HA) or Active-Active HA PostgreSQL configuration.
This is recommended for production deployments to minimize downtime and ensure continuous operations if your database server fails, especially when multiple Langflow instances rely on the same database.




1. Set up streaming replication:

    1. Configure one primary database for writes.
    2. Configure one or more replicas for reads and failover.

        Select either synchronous or asynchronous replication based on your latency and consistency requirements.

2. Implement automatic failover using one of the following options:

    * Use an HA orchestrator, distributed configuration store, and traffic router, such as [Patroni](https://patroni.readthedocs.io/en/latest/), etcd or [Consul](https://developer.hashicorp.com/consul), and [HAProxy](https://www.haproxy.org/).
    * Use [Pgpool-II](https://www.pgpool.net/docs/46/en/html/index.html) alone or add supporting services for more robust HA support.
    * Use managed services that provide built-in HA with automatic failover, such as AWS RDS or Google Cloud SQL.

3. Update your PostgreSQL connection string to point to the HA setup.
If you have a multi-instance deployment, make sure all of your Langflow instances connect to the same HA PostgreSQL database.

    The connection string you use depends on your HA configuration and services.

    * Use a virtual IP or DNS name that resolves to the current primary database, such as `postgresql://langflow:securepassword@db-proxy:5432/langflow?sslmode=require`.
    * Use the provided endpoint for a managed service, such as `langflow.cluster-xyz.us-east-1.rds.amazonaws.com`.

4. Optional: Implement load balancing for read-heavy workloads:

    1. Use a connection pooler like [PgBouncer](https://www.pgbouncer.org/) to distribute read queries across replicas.
    2. Configure Langflow to use a single connection string pointing to the primary PostgreSQL database or proxy.




To implement Active-Active HA, you must deploy multiple Langflow instances, use load balancing to distribute traffic across the instances, and ensure all instances connect to the same HA PostgreSQL database:

1. Deploy multiple Langflow instances using Kubernetes or Docker Swarm.

    You must configure your instances to use a shared PostgreSQL database.
    For more information, see [Best practices for Langflow on Kubernetes](/deployment-prod-best-practices).

2. Set up streaming replication:

    1. Configure one primary database for writes.
    2. Configure one or more replicas for reads and failover.

        Select either synchronous or asynchronous replication based on your latency and consistency requirements.

3. Implement automatic failover using one of the following options:

    * Use an HA orchestrator, distributed configuration store, and traffic router, such as [Patroni](https://patroni.readthedocs.io/en/latest/), etcd or [Consul](https://developer.hashicorp.com/consul), and [HAProxy](https://www.haproxy.org/).
    * Use [Pgpool-II](https://www.pgpool.net/docs/46/en/html/index.html) alone or add supporting services for more robust HA support.
    * Use managed services that provide built-in HA with automatic failover, such as AWS RDS or Google Cloud SQL.

4. Update your PostgreSQL connection string to point to the HA setup.
Make sure all of your Langflow instances connect to the same HA PostgreSQL database.

    The connection string you use depends on your HA configuration and services:

    * Use a virtual IP or DNS name that resolves to the current primary database, such as `postgresql://langflow:securepassword@db-proxy:5432/langflow?sslmode=require`.
    * Use the provided endpoint for a managed service, such as `langflow.cluster-xyz.us-east-1.rds.amazonaws.com`.

5. Use a load balancer to distribute requests across your instances.

The following example configuration is for a production deployment that has three `langflow-runtime` replicas, uses the Kubernetes load balancer service to distribute traffic to healthy pods, and uses the HA PostgreSQL database connection string.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: langflow-runtime
spec:
  replicas: 3
  selector:
    matchLabels:
      app: langflow-runtime
  template:
    metadata:
      labels:
        app: langflow-runtime
    spec:
      containers:
      - name: langflow
        image: langflowai/langflow:latest
        ports:
        - containerPort: 7860
        env:
        - name: LANGFLOW_DATABASE_URL
          value: "postgresql://langflow:securepassword@db-proxy:5432/langflow?sslmode=require"
---
apiVersion: v1
kind: Service
metadata:
  name: langflow-runtime
spec:
  selector:
    app: langflow-runtime
  ports:
  - port: 80
    targetPort: 7860
  type: LoadBalancer
```




After implementing HA or Active-Active HA, monitor failover events and ensure replicas are in sync.
Langflow, through [SQLAlchemy](https://docs.sqlalchemy.org/en/20/), supports reconnection attempts if `LANGFLOW_DATABASE_CONNECTION_RETRY=True`, ensures recovery after failover, and reduces disruption once the database is back online.

Although PostgreSQL handles concurrent connections well, you must still monitor for contention, deadlocks, or other performance degradation during high load.

## Impact of database failure

If the PostgreSQL database becomes unavailable, the following Langflow functions will fail:

* **Flow Retrieval**: Cannot load new or existing flows from the database.
* **Flow Saving**: Unable to save new flows or updates to existing flows.
* **User Authentication**: Login and user management functions fail.
* **Project Collection Access**: Cannot access or share community/custom project collections.
* **Configuration Retrieval**: Unable to load application settings.
* **Configuration Updates**: Changes to settings cannot be saved.
* **Execution Log Access**: Cannot retrieve historical flow execution logs.
* **Log Writing**: New execution or system activity logs cannot be recorded.
* **Multi-User Collaboration**: Sharing flows or projects across users fails.
* **API Flow Loading**: API requests to load new flows (non-cached) fail.

Flows already loaded in memory may continue to function with cached configurations.
However, any operation requiring database access fails until the database is restored.
For example, a cached flow might run, but it won't record logs or message history to the database.

To minimize the possibility and impact of database failure, use [HA configurations](#high-availability-for-postgresql) and record backups regularly.
For example, you can use `pg_dump` to create logical backups or set up continuous archiving with write-ahead logs (WAL) for point-in-time recovery.
Test restoration procedures regularly to ensure your team understands how to execute them in a disaster recovery scenario.

## Database monitoring

Monitor your PostgreSQL database to ensure optimal performance and reliability:

* Use tools like pgAdmin, Prometheus with PostgreSQL exporter, or cloud-based monitoring for PostgreSQL.
* Track performance metrics such as CPU, memory, and disk I/O usage.
* Monitor replica health, availability, lag, and synchronization.
For example, use `pg_stat_activity` to monitor connection counts and contention.
* Set up alerts and notifications for high latency, failover events, or replication issues.
* Enable PostgreSQL logging, such as `log_connections` and `log_statements`, to track access and changes.

## See also

* [Configure an external PostgreSQL database](/configuration-custom-database)
* [Langflow architecture on Kubernetes](/deployment-architecture)
* [Deploy the Langflow production environment on Kubernetes](/deployment-kubernetes-prod)

---

# Document: environment-variables

_Source: 

---
title: Environment variables
slug: /environment-variables
---


In general, environment variables, like `LANGFLOW_PORT` or `LANGFLOW_LOG_LEVEL`, configure how Langflow runs.
These are broad settings that apply to your entire Langflow deployment.

In contrast, global variables are user-defined values stored in Langflow's database for use in flows, such as `OPENAI_API_KEY`.
Langflow can also source global variables from environment variables.
For more information, see [Langflow global variables](/configuration-global-variables).

## Configure environment variables for Langflow OSS

Langflow recognizes [supported environment variables](#supported-variables) from the following sources:

- Environment variables set in your terminal.
- Environment variables imported from a `.env` file when starting Langflow.
- Environment variables set with the [Langflow CLI](./configuration-cli), including the `--env-file` option and direct options, such as `--port`.

You can choose to use one or more of these sources.

### Precedence {#precedence}

If the same environment variable is set in multiple places, the following hierarchy applies:

1. Langflow CLI options override all other sources.
2. The `.env` file overrides system environment variables.
3. System environment variables are used only if not set elsewhere.
When running a Langflow Docker image, the `-e` flag can be used to set additional system environment variables.

For example:

* If you set `LANGFLOW_PORT=8080` in your system environment and `LANGFLOW_PORT=7860` in `.env`, Langflow uses `7860` from `.env`.
* If you use the Langflow CLI to run `langflow run --env-file .env --port 9000`, and you set `LANGFLOW_PORT=7860` in `.env`, then Langflow uses `9000` from the CLI option.

### Set environment variables in your terminal {#configure-variables-terminal}

Run the following commands to set environment variables for your current terminal session:




```bash
```




```
set VARIABLE_NAME='VALUE'
```




```bash
docker run -it --rm \
    -p 7860:7860 \
    -e VARIABLE_NAME='VALUE' \
    langflowai/langflow:latest
```




When you start Langflow, it looks for environment variables that you've set in your terminal.
If it detects a supported environment variable, then it automatically adopts the specified value, subject to [precedence rules](#precedence).

### Import environment variables from a .env file {#configure-variables-env-file}

1. If Langflow is running, quit Langflow.

2. Create a `.env` file, and then open it in your preferred editor.

3. Define [Langflow environment variables](#supported-variables) in the `.env` file.

    <details>
    <summary>Example: .env</summary>

    ```text
    DO_NOT_TRACK=True
    LANGFLOW_AUTO_LOGIN=False
    LANGFLOW_AUTO_SAVING=True
    LANGFLOW_AUTO_SAVING_INTERVAL=1000
    LANGFLOW_BACKEND_ONLY=False
    LANGFLOW_BUNDLE_URLS=["https://github.com/user/repo/commit/hash"]
    LANGFLOW_CACHE_TYPE=async
    LANGFLOW_COMPONENTS_PATH=/path/to/components/
    LANGFLOW_COMPONENTS_INDEX_PATH=/path/to/component_index.json
    LANGFLOW_CONFIG_DIR=/path/to/config/
    LANGFLOW_DATABASE_URL=postgresql://user:password@localhost:5432/langflow
    LANGFLOW_DEV=False
    LANGFLOW_FALLBACK_TO_ENV_VAR=False
    LANGFLOW_HEALTH_CHECK_MAX_RETRIES=5
    LANGFLOW_HOST=localhost
    LANGFLOW_LANGCHAIN_CACHE=InMemoryCache
    LANGFLOW_MAX_FILE_SIZE_UPLOAD=10000
    LANGFLOW_MAX_ITEMS_LENGTH=100
    LANGFLOW_MAX_TEXT_LENGTH=1000
    LANGFLOW_LOG_LEVEL=error
    LANGFLOW_OPEN_BROWSER=False
    LANGFLOW_PORT=7860
    LANGFLOW_REMOVE_API_KEYS=False
    LANGFLOW_SAVE_DB_IN_CONFIG_DIR=True
    LANGFLOW_SECRET_KEY=somesecretkey
    LANGFLOW_STORE_ENVIRONMENT_VARIABLES=True
    LANGFLOW_SUPERUSER=adminuser
    LANGFLOW_SUPERUSER_PASSWORD=adminpass
    LANGFLOW_WORKER_TIMEOUT=60000
    LANGFLOW_WORKERS=3
    ```

    For additional examples, see [`.env.example`](https://github.com/langflow-ai/langflow/blob/main/.env.example) in the Langflow repository.

    </details>

4. Save and close `.env`.

5. Start Langflow with your `.env` file:

    
    

    ```bash
    uv run langflow run --env-file .env
    ```

    
    

    ```bash
    docker run -it --rm \
        -p 7860:7860 \
        --env-file .env \
        langflowai/langflow:latest
    ```

    
    

    If your `.env` file isn't in the same directory, provide the path to your `.env` file.

On startup, Langflow imports the environment variables from your `.env` file, as well as any others that you set in your terminal, and then adopts their specified values.

### Configure environment variables for development

The following examples show how to configure Langflow using environment variables in different development scenarios.




The `.env` file is a text file that contains key-value pairs of environment variables.

Create or edit a `.env` file in the root directory of your application or Langflow environment, and then add your configuration variables to the file:

<details>
<summary>Example: .env</summary>

```text title=".env"
DO_NOT_TRACK=True
LANGFLOW_AUTO_LOGIN=False
LANGFLOW_AUTO_SAVING=True
LANGFLOW_AUTO_SAVING_INTERVAL=1000
LANGFLOW_BACKEND_ONLY=False
LANGFLOW_BUNDLE_URLS=["https://github.com/user/repo/commit/hash"]
LANGFLOW_CACHE_TYPE=async
LANGFLOW_COMPONENTS_PATH=/path/to/components/
LANGFLOW_COMPONENTS_INDEX_PATH=/path/to/component_index.json
LANGFLOW_CONFIG_DIR=/path/to/config/
LANGFLOW_DATABASE_URL=postgresql://user:password@localhost:5432/langflow
LANGFLOW_DEV=False
LANGFLOW_FALLBACK_TO_ENV_VAR=False
LANGFLOW_HEALTH_CHECK_MAX_RETRIES=5
LANGFLOW_HOST=localhost
LANGFLOW_LANGCHAIN_CACHE=InMemoryCache
LANGFLOW_MAX_FILE_SIZE_UPLOAD=10000
LANGFLOW_MAX_ITEMS_LENGTH=100
LANGFLOW_MAX_TEXT_LENGTH=1000
LANGFLOW_LOG_LEVEL=error
LANGFLOW_OPEN_BROWSER=False
LANGFLOW_PORT=7860
LANGFLOW_REMOVE_API_KEYS=False
LANGFLOW_SAVE_DB_IN_CONFIG_DIR=True
LANGFLOW_SECRET_KEY=somesecretkey
LANGFLOW_STORE_ENVIRONMENT_VARIABLES=True
LANGFLOW_SUPERUSER=adminuser
LANGFLOW_SUPERUSER_PASSWORD=adminpass
LANGFLOW_WORKER_TIMEOUT=60000
LANGFLOW_WORKERS=3
```

</details>




A systemd service configuration file configures Linux system services.

To add environment variables, create or edit a service configuration file and add an `override.conf` file. This file allows you to override the default environment variables for the service.

<details>
<summary>Example: override.conf</summary>

```ini title="override.conf"
[Service]
Environment="DO_NOT_TRACK=true"
Environment="LANGFLOW_AUTO_LOGIN=false"
Environment="LANGFLOW_AUTO_SAVING=true"
Environment="LANGFLOW_AUTO_SAVING_INTERVAL=1000"
Environment="LANGFLOW_BACKEND_ONLY=false"
Environment="LANGFLOW_BUNDLE_URLS=[\"https://github.com/user/repo/commit/hash\"]"
Environment="LANGFLOW_CACHE_TYPE=async"
Environment="LANGFLOW_COMPONENTS_PATH=/path/to/components/"
Environment="LANGFLOW_COMPONENTS_INDEX_PATH=/path/to/component_index.json"
Environment="LANGFLOW_CONFIG_DIR=/path/to/config"
Environment="LANGFLOW_DATABASE_URL=postgresql://user:password@localhost:5432/langflow"
Environment="LANGFLOW_DEV=false"
Environment="LANGFLOW_FALLBACK_TO_ENV_VAR=false"
Environment="LANGFLOW_HEALTH_CHECK_MAX_RETRIES=5"
Environment="LANGFLOW_HOST=localhost"
Environment="LANGFLOW_LANGCHAIN_CACHE=InMemoryCache"
Environment="LANGFLOW_MAX_FILE_SIZE_UPLOAD=10000"
Environment="LANGFLOW_MAX_ITEMS_LENGTH=100"
Environment="LANGFLOW_MAX_TEXT_LENGTH=1000"
Environment="LANGFLOW_LOG_ENV=container_json"
Environment="LANGFLOW_LOG_FILE=logs/langflow.log"
Environment="LANGFLOW_LOG_LEVEL=error"
Environment="LANGFLOW_OPEN_BROWSER=false"
Environment="LANGFLOW_PORT=7860"
Environment="LANGFLOW_REMOVE_API_KEYS=false"
Environment="LANGFLOW_SAVE_DB_IN_CONFIG_DIR=true"
Environment="LANGFLOW_SECRET_KEY=somesecretkey"
Environment="LANGFLOW_STORE_ENVIRONMENT_VARIABLES=true"
Environment="LANGFLOW_SUPERUSER=adminuser"
Environment="LANGFLOW_SUPERUSER_PASSWORD=adminpass"
Environment="LANGFLOW_WORKER_TIMEOUT=60000"
Environment="LANGFLOW_WORKERS=3"
```

</details>

For more information on systemd, see the [Red Hat documentation](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_systemd_unit_files_to_customize_and_optimize_your_system/assembly_working-with-systemd-unit-files_working-with-systemd).




The `tasks.json` file located in `.vscode/tasks.json` is a configuration file for development environments using Visual Studio Code.

Create or edit the `.vscode/tasks.json` file in your project root.

<details>
<summary>Example: .vscode/tasks.json</summary>

```json title=".vscode/tasks.json"
{
    "version": "2.0.0",
    "options": {
        "env": {
            "DO_NOT_TRACK": "true",
            "LANGFLOW_AUTO_LOGIN": "false",
            "LANGFLOW_AUTO_SAVING": "true",
            "LANGFLOW_AUTO_SAVING_INTERVAL": "1000",
            "LANGFLOW_BACKEND_ONLY": "false",
            "LANGFLOW_BUNDLE_URLS": "[\"https://github.com/user/repo/commit/hash\"]",
            "LANGFLOW_CACHE_TYPE": "async",
            "LANGFLOW_COMPONENTS_PATH": "D:/path/to/components/",
            "LANGFLOW_COMPONENTS_INDEX_PATH": "D:/path/to/component_index.json",
            "LANGFLOW_CONFIG_DIR": "D:/path/to/config/",
            "LANGFLOW_DATABASE_URL": "postgresql://postgres:password@localhost:5432/langflow",
            "LANGFLOW_DEV": "false",
            "LANGFLOW_FALLBACK_TO_ENV_VAR": "false",
            "LANGFLOW_HEALTH_CHECK_MAX_RETRIES": "5",
            "LANGFLOW_HOST": "localhost",
            "LANGFLOW_LANGCHAIN_CACHE": "InMemoryCache",
            "LANGFLOW_MAX_FILE_SIZE_UPLOAD": "10000",
            "LANGFLOW_MAX_ITEMS_LENGTH": "100",
            "LANGFLOW_MAX_TEXT_LENGTH": "1000",
            "LANGFLOW_LOG_ENV": "container_csv",
            "LANGFLOW_LOG_FILE": "langflow.log",
            "LANGFLOW_LOG_LEVEL": "error",
            "LANGFLOW_OPEN_BROWSER": "false",
            "LANGFLOW_PORT": "7860",
            "LANGFLOW_REMOVE_API_KEYS": "true",
            "LANGFLOW_SAVE_DB_IN_CONFIG_DIR": "false",
            "LANGFLOW_SECRET_KEY": "somesecretkey",
            "LANGFLOW_STORE_ENVIRONMENT_VARIABLES": "true",
            "LANGFLOW_SUPERUSER": "adminuser",
            "LANGFLOW_SUPERUSER_PASSWORD": "adminpass",
            "LANGFLOW_WORKER_TIMEOUT": "60000",
            "LANGFLOW_WORKERS": "3"
        }
    },
    "tasks": [
        {
            "label": "langflow backend",
            "type": "shell",
            "command": ". ./langflownightly/Scripts/activate && langflow run",
            "isBackground": true,
            "problemMatcher": []
        }
    ]
}
```

</details>

To run Langflow using the above VSCode `tasks.json` file, in the VSCode command palette, select **Tasks: Run Task** > **langflow backend**.




## Set environment variables for Langflow Desktop

Environment variables set in your terminal aren't automatically available to GUI-based applications like Langflow Desktop when you launch them from the Windows or macOS GUI.

To modify environment variables for Langflow Desktop, set environment variables in a Desktop `.env` file, and then restart the app.




To modify the macOS `.env` file, do the following:

1. Create or edit `~/.langflow/data/.env`.
2. Add your Langflow environment variables, for example:

    ```text
    LANGFLOW_LOG_LEVEL=info
    LANGFLOW_DOCLING=true
    ```

3. Save the file.
4. Restart Langflow Desktop.




To modify the Windows `.env` file, do the following:

1. Create or edit `%APPDATA%\com.LangflowDesktop\data\.env`.
2. Add your Langflow environment variables, for example:

    ```text
    LANGFLOW_LOG_LEVEL=info
    LANGFLOW_DOCLING=true
    ```

3. Save the file.
4. Restart Langflow Desktop.




Windows supports two sources for Langflow Desktop environment variables: a Langflow application `.env` file, and Windows user environment variables.

The `.env` file at `%APPDATA%\com.LangflowDesktop\data\.env` is the recommended approach, but
Windows user variables are useful for single-sourcing API keys between Langflow and other Windows applications.
If the same variable is defined in both the Langflow application `.env` file and as a Windows user environment variable, the `.env` file takes precedence.

To modify the Windows user environment variables, do the following:

1. Press <kbd>Win + R</kbd>, enter `sysdm.cpl`, and then press <kbd>Enter</kbd>.
2. Click the **Advanced** tab, and then click **Environment Variables**.
3. In **User variables**, click **New**.
4. Enter the variable name, such as `OPENAI_API_KEY`, and its value.
5. Click **OK**, and then **restart Langflow Desktop**.




## Supported environment variables {#supported-variables}

The following sections provide information about specific Langflow environment variables.

### Authentication and security

See [API keys and authentication](/api-keys-and-authentication).

### Global variables

For information about the relationship between Langflow global variables and environment variables, as well as environment variables that control handling of global variables, see [Global variables](/configuration-global-variables).

### Logs {#logging}

See [Configure log options](/logging#log-storage).

### MCP servers {#mcp}

See [Use Langflow as an MCP server](/mcp-server).

### Monitoring and metrics

For environment variables for specific monitoring service providers, see the Langflow monitoring integration guides, such as [Langfuse](/integrations-langfuse) and [Best practices for Langflow on Kubernetes](/deployment-prod-best-practices).

### Server

The following environment variables set base Langflow server configuration, such as where the server is hosted, required files for SSL encryption, and the deployment type (frontend and backend, backend-only, development mode).

| Variable | Format | Default | Description |
|----------|--------|---------|-------------|
| `LANGFLOW_HOST` | String | `localhost` | The host on which the Langflow server will run. |
| `LANGFLOW_PORT` | Integer | `7860` | The port on which the Langflow server runs. The server automatically selects a free port if the specified port is in use. |
| `LANGFLOW_BACKEND_ONLY` | Boolean | `False` | Run only the Langflow backend service (no frontend). |
| `LANGFLOW_DEV` | Boolean | `False` | Whether to run Langflow in development mode (may contain bugs). |
| `LANGFLOW_OPEN_BROWSER` | Boolean | `False` | Open the system web browser on startup. |
| `LANGFLOW_HEALTH_CHECK_MAX_RETRIES` | Integer | `5` | Set the maximum number of retries for Langflow's server status health checks. |
| `LANGFLOW_WORKERS` | Integer | `1` | Number of worker processes. |
| `LANGFLOW_WORKER_TIMEOUT` | Integer | `300` | Worker timeout in seconds. |
| `LANGFLOW_SSL_CERT_FILE` | String | Not set | Path to the SSL certificate file for enabling HTTPS on the Langflow web server. This is separate from [database SSL connections](/configuration-custom-database#connect-langflow-to-a-local-postgresql-database). |
| `LANGFLOW_SSL_KEY_FILE` | String | Not set | Path to the SSL key file for enabling HTTPS on the Langflow web server. This is separate from [database SSL connections](/configuration-custom-database#connect-langflow-to-a-local-postgresql-database). |
| `LANGFLOW_DEACTIVATE_TRACING` | Boolean | `False` | Deactivate tracing functionality. |
| `LANGFLOW_CELERY_ENABLED` | Boolean | `False` | Enable Celery for distributed task processing. |
| `LANGFLOW_ALEMBIC_LOG_TO_STDOUT` | Boolean | `False` | Whether to log Alembic database migration output to stdout instead of a log file. If `true`, Alembic logs to `stdout` and the default log file is ignored. |

For more information about deploying Langflow servers, see [Langflow deployment overview](/deployment-overview).

### Storage

For file storage environment variables, see [File storage environment variables](/concepts-file-management#file-storage-environment-variables).

For database environment variables, including PostgreSQL configuration, see [Memory management options](/memory#configure-external-memory).

### Telemetry

See [Telemetry](/contributing-telemetry).

### Visual editor and Playground behavior

| Variable | Format | Default | Description |
|----------|--------|---------|-------------|
| `LANGFLOW_AUTO_SAVING` | Boolean | `True` | Whether to automatically save flows. |
| `LANGFLOW_AUTO_SAVING_INTERVAL` | Integer | `1000` | Set the auto-save interval in milliseconds if `LANGFLOW_AUTO_SAVING=True`. |
| `LANGFLOW_BUNDLE_URLS` | List[String] | `[]` | A list of URLs from which to load custom bundles. Supports GitHub URLs. If `LANGFLOW_AUTO_LOGIN=True`, flows from these bundles are loaded into the database. |
| `LANGFLOW_COMPONENTS_PATH` | String | Not set | Path to a directory containing custom components. Typically used if you have local custom components or you are building a Docker image with custom components. |
| `LANGFLOW_COMPONENTS_INDEX_PATH` | String | Not set | File path or URL (`http://` or `https://`) to a prebuilt component index JSON file used to populate built-in components in the visual editor. When not set, Langflow uses the included index. Useful for supplying a curated component index, for example in airgapped deployments. For more information, see [Block custom components](../Deployment/deployment-block-custom-components.mdx). |
| `LANGFLOW_ALLOW_CUSTOM_COMPONENTS` | Boolean | `True` | If `false`, disables custom components and in-editor editing of component code. This feature is in beta. For more information, see [Block custom components](../Deployment/deployment-block-custom-components.mdx). |
| `LANGFLOW_LOAD_FLOWS_PATH` | String | Not set | Path to a directory containing flow JSON files to be loaded on startup. Typically used when creating a Docker image with prepackaged flows. Requires `LANGFLOW_AUTO_LOGIN=True`. |
| `LANGFLOW_CREATE_STARTER_PROJECTS` | Boolean | `True` | Whether to create templates during initialization. If `false`, Langflow doesn't create templates, and `LANGFLOW_UPDATE_STARTER_PROJECTS` is treated as `false`. |
| `LANGFLOW_UPDATE_STARTER_PROJECTS` | Boolean | `True` | Whether to update templates with the latest component versions when initializing after an upgrade. |
| `LANGFLOW_LAZY_LOAD_COMPONENTS` | Boolean | `False` | If `true`, Langflow only partially loads components at startup and fully loads them on demand. This significantly reduces startup time but can cause a slight delay when a component is first used. |
| `LANGFLOW_EVENT_DELIVERY` | String | `streaming` | How to deliver build events to the frontend: `polling`, `streaming` or `direct`. |
| `LANGFLOW_FRONTEND_PATH` | String | `./frontend` | Path to the frontend directory containing build files. For development purposes only when you need to serve specific frontend code. |
| `LANGFLOW_MAX_ITEMS_LENGTH` | Integer | `100` | Maximum number of items to store and display in the visual editor. Lists longer than this will be truncated when displayed in the visual editor. Doesn't affect outputs or data passed between components. |
| `LANGFLOW_MAX_TEXT_LENGTH` | Integer | `1000` | Maximum number of characters to store and display in the visual editor. Responses longer than this will be truncated when displayed in the visual editor. Doesn't truncate outputs or responses passed between components. |
| `LANGFLOW_MAX_TRANSACTIONS_TO_KEEP` | Integer | `3000` | Maximum number of flow transaction events to keep in the database. |
| `LANGFLOW_MAX_VERTEX_BUILDS_TO_KEEP` | Integer | `3000` | Maximum number of vertex builds to keep in the database. Relates to [Playground](/concepts-playground) functionality. |
| `LANGFLOW_MAX_VERTEX_BUILDS_PER_VERTEX` | Integer | `2` | Maximum number of builds to keep per vertex. Older builds are deleted. Relates to [Playground](/concepts-playground) functionality. |
| `LANGFLOW_PUBLIC_FLOW_CLEANUP_INTERVAL` | Integer | `3600` | The interval in seconds at which data for [shared Playground](/concepts-playground#share-a-flows-playground) flows are cleaned up. Default: 3600 seconds (1 hour). Minimum: 600 seconds (10 minutes). |
| `LANGFLOW_PUBLIC_FLOW_EXPIRATION` | Integer | `86400` | The time in seconds after which a [shared Playground](/concepts-playground#share-a-flows-playground) flow is considered expired and eligible for cleanup. Default: 86400 seconds (24 hours). Minimum: 600 seconds (10 minutes). |

---

# Document: install-custom-dependencies

_Source: 

---
title: Install custom dependencies
slug: /install-custom-dependencies
---

Langflow provides optional dependency groups and support for custom dependencies to extend Langflow functionality. This guide covers how to add dependencies for different Langflow installations, including Langflow Desktop and Langflow OSS.

The Langflow codebase uses three packages, each with its own `pyproject.toml` file:

* The `main` package (`langflow`) is managed by the root level `pyproject.toml`, and it includes end-user features and main application code, such as Langchain and OpenAI. The `main` package depends on the `base` package.
* The `base` package (`langflow-base`) is managed at `src/backend/base/pyproject.toml`, and it includes core infrastructure, such as the FastAPI web framework. The `base` package depends on the `lfx` package.
* The `lfx` package is managed at `src/lfx/pyproject.toml`. LFX is a lightweight CLI tool for executing and serving Langflow flows. The `lfx` package does not provide optional dependency groups for end users.

## Install custom dependencies in Langflow Desktop {#langflow-desktop}

To add dependencies to Langflow Desktop, add an entry for the package to the application's `requirements.txt` file:

    * On macOS, the file is located at `/Users/USER/.langflow/data/requirements.txt`.
    * On Windows, the file is located at `C:\Users\USER\AppData\Roaming\com.Langflow\data\requirements.txt`.

Add each dependency to `requirements.txt` on its own line in the format `DEPENDENCY==VERSION`, such as `matplotlib==3.10.0`.

Restart Langflow Desktop to install the dependencies.

If you need to change or uninstall custom dependencies, edit the `requirements.txt` file, and then restart Langflow Desktop.

## Install custom dependencies in Langflow OSS

To install your own custom dependencies in your Langflow environment, add them with your package manager.

If you're working within a cloned Langflow repository, add dependencies with `uv add` because there is already a `pyproject.toml` file for uv to reference:

```bash
uv add DEPENDENCY
```

### Install optional dependency groups for `langflow`

The `langflow` package (main) provides optional dependency groups that extend its functionality.

By default, installing `langflow` without any extras includes all dependencies listed in the `[project.dependencies]` section. Optional dependency groups are not installed by default and must be explicitly requested.

These optional dependencies are listed in the [langflow `pyproject.toml`](https://github.com/langflow-ai/langflow/blob/main/pyproject.toml) file under `[project.optional-dependencies]`.

Install dependency groups using pip's `[extras]` syntax. For example, to install `langflow` with the `postgresql` dependency group, enter the following command:

```bash
uv pip install "langflow[postgresql]"
```

To install multiple extras, use commas to separate each dependency group:

```bash
uv pip install "langflow[postgresql,openai]"
```

### Install optional dependency groups for `langflow-base`

`langflow-base` is recommended when you want to deploy Langflow with specific dependencies only.
It contains the same codebase as `langflow`, but `langflow` includes `langflow-base` as a dependency and adds many additional dependencies on top of it.

The `langflow-base` package provides its own optional dependency groups that are separate from those in the `langflow` package. The `langflow-base` package can be installed as a standalone package with these optional dependency groups.

By default, installing `langflow-base` without any extras includes all dependencies listed in the `[project.dependencies]` section. Optional dependency groups are not installed by default and must be explicitly requested.
These optional dependency groups are listed in the [langflow-base `pyproject.toml`](https://github.com/langflow-ai/langflow/blob/main/src/backend/base/pyproject.toml) file under `[project.optional-dependencies]`.

Install `langflow-base` with optional dependency groups using pip's `[extras]` syntax. For example, to install `langflow-base` with the `postgresql` dependency group:

```bash
uv pip install "langflow-base[postgresql]"
```

To install multiple extras, use commas to separate each dependency group:

```bash
uv pip install "langflow-base[postgresql,openai]"
```

To install all optional dependencies for `langflow-base`, use the `complete` extra:

```bash
uv pip install "langflow-base[complete]"
```

### Use a virtual environment to test custom dependencies

When testing locally, use a virtual environment to isolate your dependencies and prevent conflicts with other Python projects.

For example, if you want to experiment with a custom dependency like `matplotlib` with Langflow:

```bash
# Create and activate a virtual environment
uv venv YOUR_LANGFLOW_VENV
source YOUR_LANGFLOW_VENV/bin/activate

# Install langflow and your additional dependency
uv pip install langflow matplotlib
```

You can also install `langflow-base` with specific optional dependency groups in your virtual environment:

```bash
# Install langflow-base with only the dependencies you need
uv pip install "langflow-base[postgresql,openai]" matplotlib
```

If you're working within a cloned Langflow repository, add dependencies with `uv add` to reference the existing `pyproject.toml` files:

```bash
uv add matplotlib
```

The `uv add` command automatically updates the `uv.lock` file in the appropriate location.

## Add dependencies to the Langflow codebase

When contributing to the Langflow codebase, you might need to add dependencies to Langflow.

To add a dependency to the `main` package, run `uv add DEPENDENCY` from the project root.
For example:

```bash
uv add matplotlib
```

Dependencies can be added to the `main` package as regular dependencies at `[project.dependencies]` or optional dependencies at `[project.optional-dependencies]`.

To add a dependency to the `base` package, navigate to `src/backend/base` and run:
```bash
uv add DEPENDENCY
```

To add a development dependency for testing, linting, or debugging, navigate to `src/backend/base` and run:
```bash
cd src/backend/base && uv add --group dev DEPENDENCY
```

Dependencies can be added to the `base` package as regular dependencies at `[project.dependencies]`, development dependencies at `[dependency-groups.dev]`, or optional dependencies at `[project.optional-dependencies]`.

You can optionally use `make add` instead of `uv add`:

```bash
# Equivalent to: uv add matplotlib
make add main="matplotlib"

# Equivalent to: cd src/backend/base && uv add --group dev matplotlib
make add devel="matplotlib"

# Equivalent to: cd src/backend/base && uv add matplotlib
make add base="matplotlib"
```

Alternatively, you can add these dependencies manually to the appropriate `pyproject.toml` file:

```
[project]
dependencies = [
    "matplotlib>=3.8.0"
]
```

Or as an optional dependency in the main package:

```
[project.optional-dependencies]
plotting = [
    "matplotlib>=3.8.0",
]
```

Or as a development dependency in the base package:

```
[dependency-groups]
dev = [
    "matplotlib>=3.8.0",
]
```

## See also

* [Containerize a Langflow application](/develop-application)
* [Create custom Python components](/components-custom-components)

---

# Document: integrations-arize

_Source: 

---
title: Arize
slug: /integrations-arize
---


Arize is a tool built on [OpenTelemetry](https://opentelemetry.io/) and [OpenInference](https://docs.arize.com/phoenix/reference/open-inference) for monitoring and optimizing LLM applications.

To enable Arize tracing, set the required Arize environment variables in your Langflow deployment.
Arize begins monitoring and collecting telemetry data from your LLM applications automatically.

:::tip
Instructions for integrating Langflow and Arize are also available in the Arize documentation:

* [Langflow tracing with Arize Platform](https://arize.com/docs/ax/integrations/frameworks-and-platforms/langflow/langflow-tracing)
* [Langflow tracing with Arize Phoenix](https://arize.com/docs/phoenix/integrations/langflow/langflow-tracing)
:::

## Prerequisites

* If you are using the [standard Arize platform](https://docs.arize.com/arize), you need an **Arize Space ID** and **Arize API Key**.
* If you are using the open-source [Arize Phoenix platform](https://docs.arize.com/phoenix), you need an **Arize Phoenix API key**.

## Connect Arize to Langflow




1. In your [Arize dashboard](https://app.arize.com/), copy your **Space ID** and [**API Key (Ingestion Service Account Key)**](https://arize.com/docs/ax/security-and-settings/api-keys).

2. In the root of your Langflow application, edit your existing Langflow `.env` file or create a new one.

3. Add `ARIZE_SPACE_ID` and `ARIZE_API_KEY` environment variables:

    ```bash
    ARIZE_SPACE_ID=SPACE_ID
    ARIZE_API_KEY=API_KEY
    ```

    Replace `SPACE_ID` and `API_KEY` with the values you copied from the Arize platform.

    You don't need to specify the Arize project name if you're using the standard Arize platform.

4. Start your Langflow application with your `.env` file:

    ```bash
    uv run langflow run --env-file .env
    ```




1. In your [Arize Phoenix dashboard](https://app.phoenix.arize.com/), copy your **API Key**.

2. In the root of your Langflow application, edit your existing Langflow `.env` file or create a new one.

3. Add a `PHOENIX_API_KEY` environment variable:

    ```bash
    PHOENIX_API_KEY=API_KEY
    ```

    Replace `API_KEY` with the Arize Phoenix API key that you copied from the Arize Phoenix platform.

4. Start your Langflow application with your `.env` file:

    ```bash
    uv run langflow run --env-file .env
    ```




## Run a flow and view metrics in Arize

1. In Langflow, run a flow that has an LLM-driven component, such as an **Agent** component or any language model component.
You must chat with the flow or trigger the LLM to produce traffic for Arize to trace.

    For example, you can create a flow with the **Simple Agent** template, add your OpenAI API key to the **Agent** component, and then click **Playground** to chat with the flow and generate traffic.

2. In Arize, open your project dashboard, and then wait for Arize to process the data.
This can take a few minutes.

3. To view metrics for your flows, go to the **LLM Tracing** tab.

    Each Langflow execution generates two traces in Arize:

    * The `AgentExecutor` trace is the Arize trace of LangChain's `AgentExecutor`.
    * The `UUID` trace is the trace of the Langflow components.

4. To view traces, go to the **Traces** tab.

    A _trace_ is the complete journey of a request, made of multiple _spans_.

5. To view spans, go to the **Spans** tab.

    A _span_ is a single operation within a trace.
    For example, a _span_ could be a single API call to OpenAI or a single function call to a custom tool.

    For information about tracing metrics in Arize, see the [Arize LLM tracing documentation](https://docs.arize.com/arize/llm-tracing/tracing).

6. To add a span to a [dataset](https://docs.arize.com/arize/llm-datasets-and-experiments/datasets-and-experiments), click **Add to Dataset**.

    All metrics on the **LLM Tracing** tab can be added to datasets.

7. To view a dataset, click the **Datasets** tab, and then select your dataset.

---

# Document: integrations-instana-traceloop

_Source: 

---
title: Traceloop
slug: /integrations-instana-traceloop
description: Instrument Langflow with the Traceloop SDK, and export traces and metrics to Instana using OpenTelemetry.
---

Traceloop SDK is a lightweight instrumentation toolkit designed for LLM applications.
It enables developers to automatically capture and export traces, metrics, and key observability signals from their LLM-powered workflows.

When combined with Instana, the exported telemetry data from Traceloop provides end-to-end visibility, allowing users to visualize traces, analyze performance bottlenecks, and ensure reliable operation of LLM-driven applications.

This guide demonstrates how to integrate the Instana observability platform with your Langflow application using the Traceloop SDK so you can monitor and analyze LLM performance.

## Prerequisites

- Create a [Traceloop API key](https://app.traceloop.com/settings/api-key)
- Create an [Instana endpoint and Instana key](https://www.ibm.com/docs/en/instana-observability/1.0.302)
- [Install Langflow](/get-started-installation)

## Configure environment variables

1. In the root folder of your Langflow application, edit your existing Langflow `.env` file or create a new one.

2. Enter the following environment variables, and then replace the placeholders with the values for your deployment or requirements:

   ```text
   TRACELOOP_API_KEY=tl_dummy_1234567890abcdef1234567890abcdef
   TRACELOOP_BASE_URL=https://otlp-magenta-saas.instana.rocks:4318
   TRACELOOP_HEADERS="x-instana-key=INSTANA_KEY"
   OTEL_EXPORTER_OTLP_INSECURE=false
   TRACELOOP_METRICS_ENDPOINT=HOST:8000
   TRACELOOP_METRICS_ENABLED=true
   OTEL_METRIC_EXPORT_INTERVAL=10000
   ```

   Set the necessary values for each environment variable:

   - **`TRACELOOP_API_KEY`**: A Traceloop API key to authenticate your application with Traceloop's monitoring service.
   You can get this from your Traceloop account dashboard.

      This integration uses the Traceloop SDK for instrumentation, which requires a Traceloop API key to initialize properly.
      If you don't have a Traceloop API key, you can proceed with the placeholder API key in the preceding example.

   - **`TRACELOOP_BASE_URL`**: The Instana endpoint URL for telemetry data collection, which is your Instana backend endpoint, such as `https://otlp-magenta-saas.instana.rocks:4318`.
   You can get this from your Instana configuration or by contacting your Instana administrator.

   - **`TRACELOOP_HEADERS`**: Authentication headers for Instana data collection. Set this to `"x-instana-key=INSTANA_KEY"`, replacing `INSTANA_KEY` with the Instana key from your Instana setup.

   - **`OTEL_EXPORTER_OTLP_INSECURE`**: Security setting for OpenTelemetry Protocol connections. Set to `false` for secure HTTPS/TLS connections. This is recommended for production Instana SaaS endpoints. Set to `true` for insecure HTTP connections during local development.

   - **`TRACELOOP_METRICS_ENDPOINT`**: Separate metrics endpoint configuration, in the form of `OTEL_DC_LLM_HOST:8000`. Typically set to `host.docker.internal:8000` for Docker environments. Adjust the host and port based on your deployment setup.

   - **`TRACELOOP_METRICS_ENABLED`**: Boolean to enable metrics collection. Set to `true` to activate metrics gathering.

   - **`OTEL_METRIC_EXPORT_INTERVAL`**: Interval in milliseconds for metrics export. Set to `10000` for 10-second export intervals, or adjust based on your monitoring requirements.

3. Make sure the OpenTelemetry Data Collector (OTel DC) is running and correctly configured.
Open your Collector's `config.yaml` file, enter the following configuration, and then replace the placeholder values with the values from your data collector setup or requirements:

   ```yaml
   llm.application: "LLM_DC"
   instances:
      -  otel.agentless.mode: true
         # Example endpoint: https://otlp-magenta-saas.instana.rocks:4318
         otel.backend.url: "INSTANA_ENDPOINT"
         otel.backend.using.http: false
         callback.interval: 10
         otel.service.name: "DC1"
         otel.service.port: 8000
         currency: "USD"
   ```

   This configuration enables the OTel Collector to operate in agentless mode and route telemetry data to your Instana backend with proper service identification and collection intervals for effective monitoring integration.

## Start Langflow with Traceloop environment variables

Launch your Langflow application with your `.env` file:

```bash
uv run langflow run --env-file .env
```

Traceloop automatically begins monitoring and collecting telemetry data from your LLM applications.

## Verify the integration

To verify that observability is working correctly:

1. Run a flow in Langflow to generate traffic.
2. To view traces in Instana, open Instana and click **Applications**.
3. In **Services**, search for `Langflow`.
4. Click **Langflow** to view and analyze the associated calls.

   ![Instana Traces dashboard](/img/instana-traces-dashboard.png)

5. To view metrics in Instana, open Instana and click **Infrastructure**.
6. In **Analyze Infrastructure**, click **Otel LLMonitor**.
7. To view your Metrics dashboard, click `LLM:DC1@your_machine_name.local`.

   ![Instana Metrics dashboard](/img/instana-metrics-dashboard.png)

## See also

* [Traceloop documentation](https://www.traceloop.com/docs/introduction)
* [Instana setup documentation](https://www.ibm.com/docs/en/instana-observability/1.0.300?topic=started-instana-setup)
* [Otel DC setup documentation](https://www.ibm.com/docs/en/instana-observability/1.0.300?topic=started-install-otel-data-collector-llm-odcl)

---

# Document: integrations-langfuse

_Source: 

---
title: Langfuse
slug: /integrations-langfuse
---


[Langfuse](https://langfuse.com) is an open-source platform for LLM observability. It provides tracing and monitoring capabilities for AI applications, helping developers debug, analyze, and optimize their AI systems. Langfuse integrates with various tools and frameworks, including workflow builders and runtimes like Langflow.

This guide explains how to configure Langflow to collect [tracing](https://langfuse.com/docs/tracing) data about your flow executions and automatically send the data to Langfuse.

<iframe width="760" height="415" src="https://www.youtube.com/embed/SA9gGbzwNGU?si=eDKvdtvhb3fJCSbl" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## Prerequisites

- An account in a [Langfuse Cloud](https://cloud.langfuse.com) or [Langfuse self-hosted](https://langfuse.com/self-hosting) instance
- A [running Langflow server](/get-started-installation) with a [flow](/concepts-flows) that you want to trace

:::tip
If you need a flow to test the Langfuse integration, see the [Langflow quickstart](/get-started-quickstart).
:::

## Set Langfuse credentials as environment variables {#langfuse-credentials}

1. Create a set of [Langfuse API keys](https://langfuse.com/faq/all/where-are-langfuse-api-keys).

2. Copy the following API key information:

    - Secret key
    - Public key
    - Base URL

    :::tip
    Langflow previously used `LANGFUSE_HOST` as the variable for the Langfuse base URL.
    This is still supported for backward compatibility, but `LANGFUSE_BASE_URL` is now the preferred environment variable and will be used if both values are set.
    :::

3. Set your Langfuse project credentials as environment variables.

    In the following examples, replace `SECRET_KEY`, `PUBLIC_KEY`, and `LANGFUSE_BASE_URL` with your API key details from Langfuse.
    Add the following entries to your `.env` file:

    ```bash
    LANGFUSE_SECRET_KEY=sk-...
    LANGFUSE_PUBLIC_KEY=pk-...
    LANGFUSE_BASE_URL=https://us.cloud.langfuse.com
    ```

4. Start Langflow with the configuration in the `.env` file:

    ```bash
    uv run langflow run --env-file .env
    ```

5. Run a flow.

    Langflow automatically collects and sends tracing data about the flow execution to Langfuse.

6. View the collected data in your [Langfuse dashboard](https://langfuse.com/docs/analytics/overview).

    Langfuse also provides a [public live trace example dashboard](https://cloud.langfuse.com/project/cm0nywmaa005c3ol2msoisiho/traces/f016ae6d-4527-43f5-93ba-9d78388cd3d9).

## Disable Langfuse tracing

To disable the Langfuse integration, remove the [Langfuse environment variables](#langfuse-credentials), and then restart Langflow.

## Run Langfuse and Langflow with Docker Compose

As an alternative to the previous setup, particularly for self-hosted Langfuse, you can run both services with Docker Compose.

1. Create a set of [Langfuse API keys](https://langfuse.com/faq/all/where-are-langfuse-api-keys).

2. Copy the following API key information:

    - Secret key
    - Public key
    - Base URL

    :::tip
    Langflow previously used `LANGFUSE_HOST` as the variable for the Langfuse base URL.
    `LANGFUSE_HOST` is still supported for backward compatibility, but `LANGFUSE_BASE_URL` is the preferred environment variable.
    If both values are set, then `LANGFLOW_BASE_URL` is used.
    :::

3. Add your Langflow credentials to your Langflow `docker-compose.yml` file in the `environment` section.

    The following example is based on the [example `docker-compose.yml`](https://github.com/langflow-ai/langflow/blob/main/docker_example/docker-compose.yml).

    ```yml
    services:
      langflow:
        image: langflowai/langflow:latest # or another version tag on https://hub.docker.com/r/langflowai/langflow
        pull_policy: always               # set to 'always' when using 'latest' image
        ports:
          - "7860:7860"
        depends_on:
          - postgres
        environment:
          - LANGFLOW_DATABASE_URL=postgresql://langflow:langflow@postgres:5432/langflow
          # This variable defines where the logs, file storage, monitor data and secret keys are stored.
          - LANGFLOW_CONFIG_DIR=app/langflow
          - LANGFUSE_SECRET_KEY=sk-...
          - LANGFUSE_PUBLIC_KEY=pk-...
          - LANGFUSE_BASE_URL=https://us.cloud.langfuse.com
        volumes:
          - langflow-data:/app/langflow

      postgres:
        image: postgres:16
        environment:
          POSTGRES_USER: langflow
          POSTGRES_PASSWORD: langflow
          POSTGRES_DB: langflow
        ports:
          - "5432:5432"
        volumes:
          - langflow-postgres:/var/lib/postgresql/data

    volumes:
      langflow-postgres:
      langflow-data:
    ```

4. Start the Docker container:

    ```text
    docker-compose up
    ```

5. To confirm Langfuse is connected to your Langflow container, run the following command:

    ```sh
    docker compose exec langflow python -c "import requests, os; addr = os.environ.get('LANGFUSE_BASE_URL'); print(addr); res = requests.get(addr, timeout=5); print(res.status_code)"
    ```

    If there is an error, make sure you have set the `LANGFUSE_BASE_URL` environment variable in your `docker-compose.yml` file.

    Output similar to the following indicates success:

    ```text
    https://us.cloud.langfuse.com
    200
    ```

## See also

* [Langfuse GitHub repository](https://github.com/langfuse/langfuse)

---

# Document: integrations-langsmith

_Source: 

---
title: LangSmith
slug: /integrations-langsmith
---

LangSmith is a full-lifecycle DevOps service from LangChain that provides monitoring and observability. To integrate with Langflow, add your LangChain API key and configuration as Langflow environment variables, and then start Langflow.

1. Obtain your LangChain API key from [https://smith.langchain.com](https://smith.langchain.com/)
2. Set the following environment variables in your Langflow `.env` file, replacing `LANGCHAIN_API_KEY` and `LANGSMITH_PROJECT_NAME` with your own values:

    ```text
    LANGSMITH_TRACING=True
    LANGSMITH_ENDPOINT=https://api.smith.langchain.com/
    LANGSMITH_API_KEY=LANGCHAIN_API_KEY
    LANGSMITH_PROJECT=LANGSMITH_PROJECT_NAME
    ```

    Alternatively, you can export the environment variables in your terminal instead of adding them to the `.env` file:

    ```bash
    export LANGSMITH_TRACING=True && export LANGSMITH_ENDPOINT="https://api.smith.langchain.com/" && export LANGSMITH_API_KEY="LANGCHAIN_API_KEY" && export LANGSMITH_PROJECT="LANGSMITH_PROJECT_NAME"
    ```

3. Restart Langflow with your modified `.env` file or from the terminal where you set your environment variables:

    ```bash
    langflow run --env-file .env
    ```

    If you set the environment variables in your terminal, you can omit `--env-file`.
    However, Langflow can source environment variables from `.env` _and_ your terminal.
    For more information, see [Langflow environment variables](/environment-variables).

4. Run a flow in Langflow to generate some activity.

5. View the LangSmith dashboard for monitoring and observability.

    ![LangSmith dashboard](/img/langsmith-dashboard.png)

---

# Document: integrations-langwatch

_Source: 

---
title: LangWatch
slug: /integrations-langwatch
---

[LangWatch](https://app.langwatch.ai/) is an all-in-one LLMOps platform for monitoring, observability, analytics, evaluations and alerting for getting user insights and improve your LLM workflows.

## Integrate LangWatch observability

To integrate with Langflow, add your LangWatch API key as a Langflow environment variable:

1. Get a LangWatch API key from your LangWatch account.

2. Add the key to your Langflow `.env` file:

    ```shell
    LANGWATCH_API_KEY="API_KEY_STRING"
    ```

    Alternatively, you can set the environment variable in your terminal session:

    ```shell
    export LANGWATCH_API_KEY="API_KEY_STRING"
    ```

3. Restart Langflow with your `.env` file, if you modified the Langflow `.env`:

    ```
    langflow run --env-file .env
    ```

4. Run a flow.

5. View the LangWatch dashboard for monitoring and observability.

![LangWatch dashboard](/img/langwatch-dashboard.png)

## Use the LangWatch Evaluator

In your flows, you can use the **LangWatch Evaluator** component to use LangWatch's evaluation endpoints to assess a model's performance.
This component is available in the **LangWatch** [bundle](/components-bundle-components).

---

# Document: integrations-openlayer

_Source: 

---
title: Openlayer
slug: /integrations-openlayer
---


[Openlayer](https://www.openlayer.com/) is a testing and evaluation platform for LLM applications. It provides comprehensive observability, testing, and monitoring capabilities to help you ship high-quality AI systems with confidence.

You can configure Langflow to collect tracing data about your flow executions and automatically send the data to Openlayer for analysis, monitoring, and evaluation.

## Prerequisites

- An [Openlayer account](https://www.openlayer.com/)
- A [running Langflow server](/get-started-installation) with a [flow](/concepts-flows) that you want to trace
- An Openlayer inference pipeline

:::tip
If you need a flow to test the Openlayer integration, see the [Langflow quickstart](/get-started-quickstart).
:::

## Set Openlayer credentials as environment variables

1. Get your [Openlayer API key](https://app.openlayer.com/settings/api-keys) from your Openlayer account.

2. Create an inference pipeline in Openlayer and copy the pipeline ID.

3. Set your Openlayer credentials as environment variables in the same environment where you run Langflow.

    In the following examples, replace `YOUR_API_KEY` and `YOUR_PIPELINE_ID` with your actual Openlayer credentials.

    
    

    These commands set the environment variables in a Linux or macOS terminal session:

    ```bash
    export OPENLAYER_API_KEY="YOUR_API_KEY"
    export OPENLAYER_INFERENCE_PIPELINE_ID="YOUR_PIPELINE_ID"
    ```

    
    

    These commands set the environment variables in a Windows command prompt session:

    ```cmd
    set OPENLAYER_API_KEY=YOUR_API_KEY
    set OPENLAYER_INFERENCE_PIPELINE_ID=YOUR_PIPELINE_ID
    ```

    
    

## Start Langflow and view traces in Openlayer

1. Start Langflow in the same environment where you set the Openlayer environment variables:

    ```bash
    uv run langflow run
    ```

2. Run a flow in Langflow.

    Langflow automatically collects and sends tracing data about the flow execution to Openlayer, including:
    - Component inputs and outputs
    - Execution timing and latency
    - LLM calls and nested operations
    - User and session context

3. View the collected data in your [Openlayer dashboard](https://app.openlayer.com/).

    Each flow execution appears as a trace with a hierarchical view of all components and their nested operations.

## Advanced configuration

### Flow-specific pipelines

You can configure different Openlayer inference pipelines for different flows using flow-specific environment variables:

```bash
```

The flow name is converted to uppercase and non-alphanumeric characters are replaced with underscores. For example, "My Flow-Name" becomes `OPENLAYER_PIPELINE_MY_FLOW_NAME`.

### JSON mapping

Alternatively, you can use a JSON mapping to configure multiple flows at once:




```bash
```




```cmd
set OPENLAYER_LANGFLOW_MAPPING={"Flow Name 1":"pipeline-id-1","Flow Name 2":"pipeline-id-2"}
```




### Configuration priority

Openlayer configuration is resolved in the following order (highest priority first):

1. Flow-specific environment variable: `OPENLAYER_PIPELINE_`
2. JSON mapping: `OPENLAYER_LANGFLOW_MAPPING`
3. Default environment variable: `OPENLAYER_INFERENCE_PIPELINE_ID`

This allows you to set a default pipeline for all flows and override it for specific flows as needed.

## Disable Openlayer tracing

To disable the Openlayer integration, remove the `OPENLAYER_API_KEY` environment variable, and then restart Langflow.

## Features

The Openlayer integration automatically captures:

- **Component hierarchy**: All flow components with parent-child relationships
- **LangChain callbacks**: Nested LLM calls and tool executions appear within their parent components
- **Timing metrics**: Start time, end time, and latency for each component
- **Inputs and outputs**: Component inputs and outputs with automatic type conversion
- **User context**: User ID and session ID propagation for better analytics
- **Error tracking**: Errors and logs captured in component metadata

## See also

* [Openlayer documentation](https://docs.openlayer.com/)
* [Openlayer GitHub repository](https://github.com/openlayer-ai/openlayer-python)



---

# Document: integrations-opik

_Source: 

---
title: Opik
slug: /integrations-opik
---

[Opik](https://www.comet.com/site/products/opik/) is an open-source platform designed for evaluating, testing, and monitoring large language model (LLM) applications. Developed by Comet, it aims to facilitate more intuitive collaboration, testing, and monitoring of LLM-based applications.

You can configure Langflow to collect [tracing](https://www.comet.com/docs/opik/tracing/log_traces) data about your flow executions and automatically send the data to Opik.

## Prerequisites

- An [Open-Source Opik server or an Opik Cloud account](https://www.comet.com/docs/opik/faq#what-is-the-difference-between-opik-cloud-and-the-open-source-opik-platform-)
- A [running Langflow server](/get-started-installation) with a [flow](/concepts-flows) that you want to trace

:::tip
If you need a flow to test the Opik integration, see the [Langflow quickstart](/get-started-quickstart).
:::

## Integrate Opik with Langflow

1. If you use Opik Cloud, get an [Opik API key](https://www.comet.com/docs/opik/faq#where-can-i-find-my-opik-api-key-).

    An API key isn't required with an Open-Source Opik server.

2. Call the `opik configure` CLI to save your Opik configuration in the same environment where you run Langflow:

    ```bash
    opik configure
    ```

    For self-hosted Opik, you can also use the following Opik CLI command:

    ```bash
    opik configure --use_local
    ```

    For more information, see the [Opik SDK configuration documentation](https://www.comet.com/docs/opik/tracing/sdk_configuration).

3. Start Langflow in the same terminal or environment where you set the environment variables:

    ```bash
    uv run langflow run
    ```

4. In Langflow, run a flow to produce activity for Opik to trace.

5. Navigate to your Opik project dashboard and view the collected tracing data.

## Disable the Opik integration

To disable the Opik integration, remove the environment variables you set with `opik configure`, and then restart Langflow.

---

# Document: jwt-authentication

_Source: 

---
title: JWT authentication
slug: /jwt-authentication
---


Langflow supports symmetric or asymmetric JSON Web Tokens (JWT) for user authentication and authorization.

JWT is an [open standard](https://tools.ietf.org/html/rfc7519) for securely transmitting information between parties as a JSON object.
Use JWT to create credentials that automatically expire, enable stateless authentication without database storage, and work across distributed systems.

JWT authentication with the HS256 algorithm is enabled by default, but can be configured further with the `LANGFLOW_ALGORITHM` environment variable.

<details closed>
<summary>About the JWT structure and contents</summary>

When a user logs in with their username and password at the `/api/v1/login` endpoint, Langflow validates the credentials and creates a JWT token containing the user's identity and expiration time. This token is then used for subsequent API requests instead of sending credentials with each request.

A JWT consists of three parts separated by dots (`.`):

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

* The header contains the token type and signing algorithm.
* The payload contains _claims_, which are token data for user information and expiration time.
* The signature is a secret key that ensures the token hasn't been tampered with.

Each part of the JWT is Base64URL-encoded.
You can paste this example JWT to decode the actual JSON data at [jwt.io](https://jwt.io/).

</details>

## Configure JWT environment variables

Configure JWT authentication in Langflow using the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `LANGFLOW_ALGORITHM` | JWT signing algorithm (`HS256`, `RS256`, or `RS512`) | `HS256` |
| `LANGFLOW_SECRET_KEY` | Secret key for HS256 signing | Auto-generated |
| `LANGFLOW_PRIVATE_KEY` | RSA private key for RS256/RS512 signing | Auto-generated |
| `LANGFLOW_PUBLIC_KEY` | RSA public key for RS256/RS512 verification | Derived from private key |
| `LANGFLOW_ACCESS_TOKEN_EXPIRE_SECONDS` | Access token expiration time | `3600` (1 hour) |
| `LANGFLOW_REFRESH_TOKEN_EXPIRE_SECONDS` | Refresh token expiration time | `604800` (7 days) |

## Configure signing algorithms

Langflow supports multiple signing algorithms and both symmetric (HS256) and asymmetric (RS256, RS512) JWTs.

Which method you choose depends upon your deployment's requirements.

### HS256 (Default)

HS256 is the default JWT algorithm, with a good security level for single-server deployments.
Langflow automatically generates and persists a secret key.
No configuration is necessary, but if you want to explicitly set it in the Langflow `.env`, the default value is `LANGFLOW_ALGORITHM=HS256`.

To generate a custom secure key instead of using the Langflow-generated secret key, do the following:

1. Generate a secure secret key with the Python secrets module or OpenSSL.
    The key must be at least 32 characters long.

    **Using Python:**

    ```bash
    python -c "import secrets; print(secrets.token_urlsafe(32))"
    ```

    **Using OpenSSL:**

    ```bash
    openssl rand -base64 32
    ```

2. Set the value for `LANGFLOW_SECRET_KEY` in your `.env` file.
    ```bash
    LANGFLOW_ALGORITHM="HS256"
    LANGFLOW_SECRET_KEY="your-custom-secret-key"
    ```

### RS256

The RS256 signing algorithm provides better security for production deployments by using a pair of private and public keys.
The private key signs tokens, and the public verifies them.
The private key must be kept secret, while the public key can be safely shared.

To automatically generate a private and public key pair and store it in the Langflow [`LANGFLOW_CONFIG_DIR`](/logging), set `LANGFLOW_ALGORITHM="RS256"` in your Langflow `.env`.
When Langflow starts, it will:
1. Check if RSA keys exist in the configuration directory.
2. If not, generate a new 2048-bit RSA key pair.
3. Save the keys to `private_key.pem` and `public_key.pem`.
4. Reuse the same keys on subsequent startups.

To use a custom private key instead of the auto-generated keys, set the following in your `.env` file.
The `LANGFLOW_PUBLIC_KEY` will be automatically derived from the private key.

```bash
LANGFLOW_ALGORITHM=RS256
LANGFLOW_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEF...
-----END PRIVATE KEY-----"
```

To use a custom key pair, set both keys in your Langflow `.env` file.

```bash
LANGFLOW_ALGORITHM=RS256
LANGFLOW_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEF...
-----END PRIVATE KEY-----"
LANGFLOW_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOC...
-----END PUBLIC KEY-----"
```

To generate an RSA key pair manually, do the following:

1. Generate a 2048-bit private key:
   ```bash
   openssl genrsa -out private_key.pem 2048
   ```

2. Extract the public key from the private key:
   ```bash
   openssl rsa -in private_key.pem -pubout -out public_key.pem
   ```

3. Verify the keys were created:
   ```bash
   cat private_key.pem
   cat public_key.pem
   ```

### RS512

RS512 uses the same RSA format of private and public keys as RS256, but uses the SHA-512 hashing algorithm for greater security.
The private key signs tokens, and the public verifies them.
The private key must be kept secret, while the public key can be safely shared.

To automatically generate a private and public key pair and store it in the Langflow [`LANGFLOW_CONFIG_DIR`](/logging), set `LANGFLOW_ALGORITHM="RS512"` in your Langflow `.env`.
When Langflow starts, it does the following:
1. Check if RSA keys exist in the configuration directory.
2. If not, generate a new 2048-bit RSA key pair.
3. Save the keys to `private_key.pem` and `public_key.pem`.
4. Reuse the same keys on subsequent startups.

To use a custom private key instead of the auto-generated keys, set the following in your `.env` file.
The `LANGFLOW_PUBLIC_KEY` will be automatically derived from the private key.

```bash
LANGFLOW_ALGORITHM=RS512
LANGFLOW_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEF...
-----END PRIVATE KEY-----"
```

To use a custom key pair, set both keys in your Langflow `.env` file.

```bash
LANGFLOW_ALGORITHM=RS512
LANGFLOW_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEF...
-----END PRIVATE KEY-----"
LANGFLOW_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOC...
-----END PUBLIC KEY-----"
```

To generate an RSA key pair manually, do the following:

1. Generate a 2048-bit private key:
   ```bash
   openssl genrsa -out private_key.pem 2048
   ```

2. Extract the public key from the private key:
   ```bash
   openssl rsa -in private_key.pem -pubout -out public_key.pem
   ```

3. Verify the keys were created:
   ```bash
   cat private_key.pem
   cat public_key.pem
   ```

## Configure Docker and Kubernetes deployments

Use Docker with HS256 (symmetric) for single-server deployments or development environments where simplicity is preferred.

Use Docker or Kubernetes with RS256 (asymmetric) for production deployments requiring enhanced security with private/public key pairs.

### Docker with HS256

1. Add the value for your JWT secret key to the Langflow `.env` file.
    ```bash
    JWT_SECRET_KEY=your-secret-key
    ```

2. Set the signing algorithm and include a variable for the secret key in the Docker Compose file.
    ```yaml
    version: "3.8"
    services:
      langflow:
        image: langflowai/langflow:latest
        environment:
          - LANGFLOW_ALGORITHM=HS256
          - LANGFLOW_SECRET_KEY=${JWT_SECRET_KEY}  # Set in .env file
        volumes:
          - langflow_data:/app/langflow

    volumes:
      langflow_data:
    ```

### Docker with RS256

To use Langflow's automatically generated key pair, set the `RS256` signing algorithm in the Docker Compose file.

```yaml
# docker-compose.yml
version: "3.8"
services:
  langflow:
    image: langflowai/langflow:latest
    environment:
      - LANGFLOW_ALGORITHM=RS256
    volumes:
      - langflow_data:/app/langflow  # Keys stored here

volumes:
  langflow_data:
```

To mount an existing key pair, set the `RS256` signing algorithm and mount the private and public keys as volumes.

```yaml
# docker-compose.yml
version: "3.8"
services:
  langflow:
    image: langflowai/langflow:latest
    environment:
      - LANGFLOW_ALGORITHM=RS256
    volumes:
      - ./keys/private_key.pem:/app/langflow/private_key.pem:ro
      - ./keys/public_key.pem:/app/langflow/public_key.pem:ro
      - langflow_data:/app/langflow

volumes:
  langflow_data:
```

### Kubernetes with RS256

Store JWT keys as Kubernetes Secrets and reference them in your Langflow deployment configuration.

```yaml
# jwt-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: langflow-jwt-keys
type: Opaque
stringData:
  algorithm: "RS256"
  private-key: |
    -----BEGIN PRIVATE KEY-----
    MIIEvgIBADANBgkqhkiG9w0BAQEF...
    -----END PRIVATE KEY-----
  public-key: |
    -----BEGIN PUBLIC KEY-----
    MIIBIjANBgkqhkiG9w0BAQEFAAOC...
    -----END PUBLIC KEY-----
---
# langflow-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: langflow
spec:
  template:
    spec:
      containers:
        - name: langflow
          image: langflowai/langflow:latest
          env:
            - name: LANGFLOW_ALGORITHM
              valueFrom:
                secretKeyRef:
                  name: langflow-jwt-keys
                  key: algorithm
            - name: LANGFLOW_PRIVATE_KEY
              valueFrom:
                secretKeyRef:
                  name: langflow-jwt-keys
                  key: private-key
            - name: LANGFLOW_PUBLIC_KEY
              valueFrom:
                secretKeyRef:
                  name: langflow-jwt-keys
                  key: public-key
```

## Configure token expiration

To configure access and refresh token expiration times, set the values in the Langflow `.env`.

```bash
LANGFLOW_ACCESS_TOKEN_EXPIRE_SECONDS=3600  # 1 hour
LANGFLOW_REFRESH_TOKEN_EXPIRE_SECONDS=604800  # 7 days
```

Access tokens authenticate API requests and typically expire within 15 minutes to 1 hour to limit security risks.

Refresh tokens obtain new access tokens without requiring the user to log in again.
Refresh tokens typically expire within 7 to 30 days.

When an access token expires, the client can use the refresh token to get a new access token from the `/api/v1/refresh` endpoint.
This maintains the user's session without prompting for credentials again.

## See also

- [Langflow API keys and authentication](/api-keys-and-authentication)
- [JWT.io](https://jwt.io/)
- [RFC 7519 specification](https://tools.ietf.org/html/rfc7519)
- [OWASP JWT Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [Langflow Security Best Practices](/security)

---

# Document: knowledge

_Source: 

---
title: Manage vector data
slug: /knowledge
---


Vector data is critical to AI applications.
Langflow provides several components to help you store and retrieve vector data in your flows, including embedding models, vector stores, and knowledge bases.

## Embedding models

Embedding model components generate text embeddings using a specified Large Language Model (LLM).

There are two common use cases for these components:

* **Store vectors**: Generate embeddings for content written to a vector database.
* **Search vectors**: Generate an embedding from a query to run a similarity search.

In both cases the embedding model component is attached to a vector store component.
For more information, examples, and available options, see [Embedding model components](/components-embedding-models).

Alternatively, you can use [knowledge bases](#knowledge-bases), which include built-in support for several embedding models.

## Vector stores

Vector store components read and write to vector databases.
Typically, these components connect to remote databases, but some vector store components support local databases.




<details>
<summary>Example: Vector search flow</summary>




</details>

## Knowledge bases




### Knowledge base storage locations

Each knowledge base is a [ChromaDB](https://docs.trychroma.com/docs/overview/introduction) vector database.
Each database is stored in a separate directory that contains the following:

- **Vector embeddings**: Embeddings are stored using the Chroma vector database.
- **Metadata files**: Configuration and embedding model information.
- **Source data**: The original data used to create the knowledge base.

Knowledge bases are stored local to your Langflow instance.
The default storage location depends on your operating system and installation method:

- **Langflow Desktop**:
    - **macOS**: `/Users/<username>/.langflow/knowledge_bases`
    - **Windows**: `C:\Users\<name>\AppData\Roaming\com.LangflowDesktop\knowledge_bases`
- **Langflow OSS**:
    - **macOS/Windows/Linux/WSL with `uv pip install`**: `<path_to_venv>/lib/python3.12/site-packages/langflow/knowledge_bases` (Python version can vary. Knowledge bases aren't shared between virtual environments.)
    - **macOS/Windows/Linux/WSL with `git clone`**: `<path_to_clone>/src/backend/base/langflow/knowledge_bases`

If you set the `LANGFLOW_CONFIG_DIR` environment variable, the `knowledge_bases` subdirectory is created relative to that path.

To change the default `knowledge_bases` directory path, set the `LANGFLOW_KNOWLEDGE_BASES_DIR` environment variable:

```bash
```

### Create a knowledge base

In this example, you'll create a knowledge base of chunked customer orders.
To follow along with this example, download [`customer-orders.csv`](/files/customer_orders.csv) to your local machine, or adapt the steps for your own structured data.

1. On the [**Projects** page](/concepts-flows#projects) page, click **Knowledge** below the list of projects to view and manage your knowledge bases.

2. To create a new knowledge base, click **Add Knowledge**.
3. In the **Create Knowledge Base** pane, enter a name for your knowledge base, and select an embedding model.
    
4. To configure sources for your knowledge base, click **Configure Sources**.
Optionally, to create an empty knowledge base, click **Create**.
5. In the **Configure Sources** pane, configure the sources for your knowledge base's data, and also how the embedded data will be chunked for vector search retrieval.
    For this example, click **Add Sources**, and then select the downloaded [`customer-orders.csv`](/files/customer_orders.csv) file from your local machine.
    The default settings for **Chunk Size**, **Chunk Overlap**, and **Separator** are fine.
    To continue, click **Next Step**.
6. The **Review & Build** pane allows you to preview your first chunk before you commit to spending tokens to embedall of the data into the knowledge base.
    If the chunk isn't what you want to embed, click **Back** to configure your chunking strategy.
    To embed this data, click **Create**.
7. Your data is embedded as a **Knowledge**.
    When it is available to use, the **Status** changes to **Ready**.

To use the new knowledge base in a flow, see [Use the Knowledge Base component in a flow](/knowledge-base).

### Manage knowledge bases

On the [**Projects** page](/concepts-flows#projects) page, click **Knowledge** below the list of projects to view and manage your knowledge bases.

For each knowledge base, you can see the following information:

* Name
* Embedding model
* Size on disk
* Number of words, characters, and chunks
* The average length and size of chunks
* The knowledge base's status

Chunking behavior is determined by the embedding model, and the embedding model is set when you create the knowledge base.
If you need to change the embedding model, you must delete and recreate the knowledge base.

To update a knowledge base with , click  **More**, and then select  **Update Knowledge Base**.

To view a knowledge base's chunks, click  **More**, and then select  **View Chunks**.

To delete a knowledge base, click  **More**, and then click  **Delete**.
If any flows use the deleted knowledge base, you must update them to use a different knowledge base.

For more information on using knowledge bases in a flow, see the [**Knowledge Base** component](/knowledge-base) documentation.

## See also

* [Use Langflow agents](/agents)
* [Language model components](/components-models)

---

# Document: logging

_Source: 

---
title: Logs
slug: /logging
---


Langflow produces logs for individual flows and the Langflow application itself using the [structlog](https://www.structlog.org) library for logging.

The default, primary logfile is named `langflow.log`.

Log files are stored in JSON format with structured metadata.

## Log storage

Langflow logs are stored in the config directory specified in the `LANGFLOW_CONFIG_DIR` environment variable.
The default config directory location depends on your operating system and installation method:

- **Langflow Desktop**:

    - **macOS**: `/Users/<username>/Library/Logs/com.LangflowDesktop`
    - **Windows**: `C:\Users\<username>\AppData\Local\com.LangflowDesktop\logs`

- **OSS Langflow**:

    - **macOS with `uv pip install`**: `/Users/<username>/Library/Caches/langflow`
    - **Linux with `uv pip install`**: `/home/<username>/.cache/langflow`
    - **Windows/WSL with `uv pip install`**: `C:\Users\<username>\AppData\Local\langflow\langflow\Cache`
    - **macOS/Windows/Linux/WSL with `git clone`**: `<path_to_clone>/src/backend/base/langflow/`

To customize log storage locations and behaviors, set the following [Langflow environment variables](/environment-variables) in your Langflow `.env` file, and then start Langflow with `uv run langflow run --env-file .env`:

| Variable | Format | Default | Description |
|----------|--------|---------|-------------|
| `LANGFLOW_CONFIG_DIR` | String | Varies | Set the Langflow configuration directory where files and logs are stored. Default path depends on your installation, as described in the preceding list. |
| `LANGFLOW_LOG_LEVEL` | String | `ERROR` | Sets the log level as one of `DEBUG`, `ERROR`, `INFO`, `WARNING`, and `CRITICAL`. For example, `LANGFLOW_LOG_LEVEL=DEBUG`. |
| `LANGFLOW_LOG_FILE` | String | Not set | Sets the log file storage location if you want to use a non-default location. For example, `LANGFLOW_LOG_FILE=path/to/logfile.log`. If not set, logs are written to stdout. |
| `LANGFLOW_LOG_ENV` | String | `default` | This variable is the primary log format controller. `container`: JSON format for Docker/structured logging. `container_csv`: Key-value format for data analysis. `default` or unset: Uses `LANGFLOW_PRETTY_LOGS` to determine format. |
| `LANGFLOW_PRETTY_LOGS` | Boolean | `True` | This variable controls log output format when `LANGFLOW_LOG_ENV=default` or unset. When `true`, uses structlog's [ConsoleRenderer](https://www.structlog.org/en/stable/console-output.html). When `false`, outputs logs in JSON format.  |
| `LANGFLOW_LOG_FORMAT` | String | Not set | Switch between key-value format and console format. Set to `key_value` for key-value format or `console` to use structlog's [ConsoleRenderer](https://www.structlog.org/en/stable/console-output.html). This variable only works when `LANGFLOW_LOG_ENV=default` and `LANGFLOW_PRETTY_LOGS=true`. |
| `LANGFLOW_LOG_ROTATION` | String | `1 day` | Controls when the log file is rotated, either based on time or file size. For time-based rotation, set to `1 day`, `12 hours`, or `1 week`. For size-based rotation, set to `10 MB` or `1 GB`. To disable rotation, set to `None`. If disabled, log files grow without limit. |
| `LANGFLOW_ENABLE_LOG_RETRIEVAL` | Boolean | `False` | Enables retrieval of logs from your Langflow instance with [Logs endpoints](/api-logs). |
| `LANGFLOW_LOG_RETRIEVER_BUFFER_SIZE` | Integer | `10000` | Set the buffer size for log retrieval if `LANGFLOW_ENABLE_LOG_RETRIEVAL=True`. Must be greater than `0` for log retrieval to function. |
| `LANGFLOW_NATIVE_TRACING` | Boolean | `true` | Enables the tracer to record execution traces directly in the Langflow database for use in Trace View. Set to `false` to disable tracing. |

## View logs in real-time

To monitor Langflow logs as they are generated, you can follow the log file:

1. Change to your [Langflow config directory](#log-storage):

    
    

    ```bash
    cd /Users/**USERNAME**/Library/Caches/langflow
    ```

    
    

    ```cmd
    cd C:\Users\**USERNAME**\AppData\Local\com.LangflowDesktop\logs
    ```

    
    

2. Tail the main log file:

    
    

    ```bash
    tail -f langflow.log
    ```

    
    

    ```cmd
    Get-Content -Wait -Path langflow.log
    ```

    
    

    If you don't see new log entries, check that Langflow is running, and perform some actions to generate logs events. You can also check the terminal where you started Langflow to see if logs are being printed there.

## Flow and component logs

After you run a flow, you can inspect the logs for the each component and flow run.
For example, you can inspect `Message` objects ingested and generated by [Input and Output components](/chat-input-and-output).

### View flow logs

In the visual editor, click **Logs** to view logs for the entire flow:

![Logs pane](/img/logs.png)

Then, click the cells in the **inputs** and **outputs** columns to inspect the `Message` objects.
For example, the following `Message` data could be the output from a **Chat Input** component:

```text
    "messages": [
    {
        "message": "What's the recommended way to install Docker on Mac M1?",
        "sender": "User",
        "sender_name": "User",
        "session_id": "Session Apr 21, 17:37:04",
        "stream_url": null,
        "component_id": "ChatInput-4WKag",
        "files": [],
        "type": "text"
    }
    ],
```

In the case of Input/Output components, the original input might not be structured as a `Message` object.
For example, a language model component can pass a raw text response to a **Chat Output** component that is then transformed into a `Message` object.

You can find `.log` files for flows at your Langflow installation's log storage location.
For filepaths, see [Log storage](#log-storage).

### View chat logs

In the **Playground**, you can inspect the chat history for each chat session.
For more information, see [View chat history](/concepts-playground#view-chat-history).

### View output from a single component

When debugging issues with the format or content of a flow's output, it can help to inspect each component's output to determine where data is being lost or malformed.

To view the output produced by a single component during the most recent run, click  **Inspect output** on the component in the visual editor.

## Access Langflow Desktop logs {#desktop-logs}

If you encounter issues with Langflow Desktop, you might need to access startup logs for debugging.
Follow the steps for your operating system.




1. Open Terminal and run:
   ```bash
   cd ~/Library/Logs/com.LangflowDesktop
   ```

2. To open the folder and view the log files, run the command:
   ```bash
   open .
   ```

3. Locate the `langflow.log` file.




1. Open the Command Prompt (CMD), and then run the following command:

   ```cmd
   cd %LOCALAPPDATA%\com.LangflowDesktop\cache
   ```

2. Open the folder and view the log files:

   ```cmd
   start .
   ```

3. Locate the `langflow.log` file.




You can use the log file to investigate the issue on your own, add context to a [GitHub Issue](/contributing-github-issues), or send it to [support](/luna-for-langflow) for debugging assistance.

The log file is only created when Langflow Desktop runs. If you don't see a log file, try starting Langflow Desktop first, then check for the log file.

## See also

* [Logs endpoints](/api-logs)
* [Memory management options](/memory)
* [Configure an external PostgreSQL database](/configuration-custom-database)

---

# Document: memory

_Source: 

---
title: Memory management options
slug: /memory
---

Langflow provides flexible memory management options for storage and retrieval of data relevant to your flows and your Langflow server.
This includes essential Langflow database tables, file management, and caching, as well as chat memory.

## Storage options and paths

Langflow supports both local memory and external memory options.

Langflow's default storage option is a [SQLite](https://www.sqlite.org/) database.
The default storage path depends on your operating system and installation method:

- **Langflow Desktop**:
    - **macOS**: `/Users/<username>/.langflow/data/database.db`
    - **Windows**: `C:\Users\<name>\AppData\Roaming\com.LangflowDesktop\data\database.db`
- **Langflow OSS**
    - **macOS/Windows/Linux/WSL with `uv pip install`**: `<path_to_venv>/lib/python3.12/site-packages/langflow/langflow.db` (Python version can vary. Database isn't shared between virtual environments because it is tied to the venv path.)
    - **macOS/Windows/Linux/WSL with `git clone`**: `<path_to_clone>/src/backend/base/langflow/langflow.db`

Langflow offers a few alternatives to the default database path:

* **Config directory**: Set `LANGFLOW_SAVE_DB_IN_CONFIG_DIR=True` to store the database in your Langflow config directory as set in [`LANGFLOW_CONFIG_DIR`](/logging).

* **External PostgreSQL database**: You can use an external PostgreSQL database for all of your Langflow storage.
For more information, see [Configure external memory](#configure-external-memory)

    External storage can be useful if you want to preserve the data after uninstalling Langflow or to share the same database between multiple virtual environments.

* **Separate chat memory**: You can selectively use external storage for chat memory only, separate from other Langflow storage.
For more information, see [Store chat memory](#store-chat-memory).

* **No database**: To disable all database operations and run a no-op session, set `LANGFLOW_USE_NOOP_DATABASE=True` in your [Langflow environment variables](/environment-variables).
This is useful for testing when you don't want to persist any data.

## Langflow database tables

The following tables are stored in `langflow.db`:

• **ApiKey**: Manages Langflow API authentication keys. Component API keys are stored in the **Variables** table. For more information, see [API keys and authentication](/api-keys-and-authentication).

• **File**: Stores metadata for files uploaded to Langflow's file management system, including file names, paths, sizes, and storage providers. For more information, see [Manage files](/concepts-file-management).

• **Flow**: Contains flow definitions, including nodes, edges, and components, stored as JSON or database records. For more information, see [Build flows](/concepts-flows).

    :::tip
    To automatically remove API keys and tokens from flow data before saving a flow to the database, set `LANGFLOW_REMOVE_API_KEYS=True` in your [Langflow environment variables](/environment-variables).
    When `true`, any field marked as a password field that _also_ has `api`, `key`, or `token` in its name is set to `null` before the flow is saved.
    This helps prevent credentials from being stored in the database.
    :::

• **Folder**: Provides a structure for flow storage, including single-user folders and shared folders accessed by multiple users. For more information, see [Manage flows in projects](/concepts-flows#projects).

• **Message**: Stores chat messages and interactions that occur between components. For more information, see [Message objects](/data-types#message) and [Store chat memory](#store-chat-memory).

• **Trace** and **Span**: Stores traces and spans for flows and components. For more information, see [Traces](/traces).

• **Transactions**: Records execution history and results of flow runs. This information is used for [logging](/logging).

• **User**: Stores user account information including credentials, permissions, profiles, and user management settings. For more information, see [API keys and authentication](/api-keys-and-authentication).

• **Variables**: Stores global encrypted values and credentials. For more information, see [Global variables](/configuration-global-variables) and [Component API keys](/api-keys-and-authentication#component-api-keys).

• **VertexBuild**: Tracks the build status of individual nodes within flows. For more information, see [Test flows in the Playground](/concepts-playground).

For more information, see the database models in the [source code](https://github.com/langflow-ai/langflow/tree/main/src/backend/base/langflow/services/database/models).

## Configure external memory {#configure-external-memory}

To replace the default Langflow SQLite database with another database, set the `LANGFLOW_DATABASE_URL` environment variable to your database URL, and then start Langflow with your `.env` file.
For more information and examples, see [Configure an external PostgreSQL database](/configuration-custom-database).

```text
LANGFLOW_DATABASE_URL=postgresql://user:password@localhost:5432/langflow
```

To fine-tune your database connection pool and timeout settings, you can set the following additional environment variables:

* `LANGFLOW_DATABASE_CONNECTION_RETRY`: Whether to retry lost connections to your Langflow database. If `true`, Langflow tries to connect to the database again if the connection fails. Default: `false`.

* `LANGFLOW_DB_CONNECT_TIMEOUT`: The number of seconds to wait before giving up on a lock to be released or establishing a connection to the database. This may be separate from the `pool_timeout` in `LANGFLOW_DB_CONNECTION_SETTINGS`. Default: 30.

* `LANGFLOW_MIGRATION_LOCK_NAMESPACE`: Optional namespace identifier for PostgreSQL advisory lock during migrations. If not provided, a hash of the database URL will be used. Useful when multiple Langflow instances share the same database and need coordinated migration locking

* `LANGFLOW_DB_CONNECTION_SETTINGS`: A JSON dictionary containing the following database connection pool settings:

    - `pool_size`: The base number of connections to keep open in the connection pool. Default: 20.
    - `max_overflow`: Maximum number of connections that can be created in excess of `pool_size` if needed. Default: 30.
    - `pool_timeout`: Number of seconds to wait for a connection from the pool before timing out. Default: 30.
    - `pool_pre_ping`: If `true`, the pool tests connections for liveness upon each checkout. Default: `true`.
    - `pool_recycle`: Number of seconds after which a connection is automatically recycled. Default: 1800 (30 minutes).
    - `echo`: If `true`, SQL queries are logged for debugging purposes. Default: `false`.

    For example:

    ```text
    LANGFLOW_DB_CONNECTION_SETTINGS='{"pool_size": 20, "max_overflow": 30, "pool_timeout": 30, "pool_pre_ping": true, "pool_recycle": 1800, "echo": false}'
    ```

    Don't use the deprecated environment variables `LANGFLOW_DB_POOL_SIZE` or `LANGFLOW_DB_MAX_OVERFLOW`.
    Instead, use `pool_size` and `max_overflow` in `LANGFLOW_DB_CONNECTION_SETTINGS`.

* `LANGFLOW_MIGRATION_LOCK_NAMESPACE`: Optional namespace for PostgreSQL advisory locks used during database migrations. This is useful when running multiple Langflow instances that share the same PostgreSQL database. Each instance should use a unique namespace to avoid conflicts. If not set, Langflow uses a default namespace. This setting only applies when using PostgreSQL as your database backend.

## Configure cache memory

The default Langflow caching behavior is an asynchronous, in-memory cache:

```text
LANGFLOW_LANGCHAIN_CACHE=InMemoryCache
LANGFLOW_CACHE_TYPE=async
```

Langflow officially supports only the default asynchronous, in-memory cache, which is suitable for most use cases.
Other cache options, such as Redis, are experimental and can change without notice.
If you want to use a non-default cache setting, you can use the following environment variables:

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `LANGFLOW_CACHE_TYPE` | String | `async` | Set the cache type for Langflow's internal caching system. Possible values: `async`, `redis`, `memory`, `disk`. If you set the type to `redis`, then you must also set the `LANGFLOW_REDIS_*` environment variables. |
| `LANGFLOW_LANGCHAIN_CACHE` | String | `InMemoryCache` | Set the cache storage type for the LangChain caching system (a Langflow dependency), either `InMemoryCache` or `SQLiteCache`. |
| `LANGFLOW_REDIS_HOST` | String | `localhost` | Redis server hostname if `LANGFLOW_CACHE_TYPE=redis`. |
| `LANGFLOW_REDIS_PORT` | Integer | `6379` | Redis server port if `LANGFLOW_CACHE_TYPE=redis`. |
| `LANGFLOW_REDIS_DB` | Integer | `0` | Redis database number if `LANGFLOW_CACHE_TYPE=redis`. |
| `LANGFLOW_REDIS_CACHE_EXPIRE` | Integer | `3600` | Cache expiration time in seconds if `LANGFLOW_CACHE_TYPE=redis`. |
| `LANGFLOW_REDIS_PASSWORD` | String | Not set | Optional password for Redis authentication if `LANGFLOW_CACHE_TYPE=redis`. |

## Store chat memory

Chat-based flows with a **Chat Input** or **Chat Output** component produce chat history that is stored in the Langflow `messages` table.
At minimum, this serves as a chat log, but it isn't functionally the same as chat memory that provides historical context to an LLM.

To store and retrieve chat memories in flows, you can use a **Message History** component or the **Agent** component's built-in chat memory.

<details>
<summary>How does chat memory work?</summary>

Chat memory is a cache for an LLM or agent to preserve past conversations to retain and reference that context in future interactions.
For example, if a user has already told the LLM their name, the LLM can retrieve that information from chat memory rather than asking the user to repeat themselves in future conversations or messages.

Chat memory is distinct from vector store memory because it is built specifically for storing and retrieving chat messages from databases.

Components that support chat memory (such as the **Agent** and **Message History** components) provide access to their respective databases _as memory_.
Retrieval as memory is an important distinction for LLMs and agents because this storage and retrieval mechanism is specifically designed to recall context from past conversations.
Unlike vector stores, which are designed for semantic search and retrieval of text chunks, chat memory is designed to store and retrieve chat messages in a way that is optimized for conversation history.

</details>

### Session ID and chat memory

Chat history and memories are grouped by [session ID (`session_id`)](/session-id).

The default session ID is the flow ID, which means that all chat messages for a flow are stored under the same session ID as one large chat session.

For better segregation of chat memory, especially in flows used by multiple users, consider using custom session IDs.
For example, if you use user IDs as session IDs, then each user's chat history is stored separately, isolating the context of their chats from other users' chats.

### Chat memory options

Where and how chat memory is stored depends on the components used in your flow:

* **Agent component**: This component has built-in chat memory that is enabled by default.
This memory allows the agent to retrieve and reference messages from previous conversations associated with the same session ID.
All messages are stored in [Langflow storage](#storage-options-and-paths), and the component provides minimal memory configuration options, such as the number of messages to retrieve.

    The **Agent** component's built-in chat memory is sufficient for most use cases.

    If you want to use external chat memory storage, retrieve memories outside the context of a chat, or use chat memory with a language model component (not an agent), you must use the **Message History** component (with or without a third-party chat memory component).

* **Message History component**: By default, this component stores and retrieves memories from Langflow storage, unless you attach a third-party chat memory component. It provides a few more options for sorting and filtering memories, although most of these options are also built-in to the **Agent** component as configurable or fixed parameters.

    You can use the **Message History** component with or without a language model or agent.
    For example, if you need to retrieve data from memories outside of chat, you can use the **Message History** component to fetch that data directly from your chat memory database without feeding it into a chat.

* **Third-party chat memory components**: Use one of these components only if you need to store or retrieve chat memories from a dedicated external chat memory database.
Typically, this is necessary only if you have specific storage needs that aren't met by Langflow storage.
For example, if you want to manage chat memory data by directly working with the database, or if you want to use a different database than the default Langflow storage.

For more information and examples, see [**Message History** component](/message-history) and [Agent memory](/agents#agent-memory).

## See also

* [Langflow file management](/concepts-file-management)
* [Langflow logs](/logging)
* [Langflow environment variables](/environment-variables)

---

# Document: session-id

_Source: 

---
title: Use session ID to manage communication between components
slug: /session-id
---

Session ID is a unique identifier for client/server connections. A single session equals the duration of a client's connection to a server.

In the Langflow **Playground**, current sessions are listed on the left side of the pane.

Langflow uses session IDs to track different chat interactions within flows. This allows multiple chat sessions to exist in a single flow. Messages are stored in the database with session IDs as a reference.

This differentiation between users per session is helpful in managing client/server connections, but is also important in maintaining separate conversational contexts within a single flow. LLMs rely on past interactions to generate responses to queries, and if these conversations aren't separated, the responses becomes less useful, or even confused.

## Customize session ID

Custom session IDs can be set as part of the payload in API calls, or as advanced settings in individual components. The API session ID value takes precedence. If no session ID is specified, the flow ID is assigned.

If you set a custom session ID in a payload, all downstream components use the upstream component's session ID value.
Replace `LANGFLOW_SERVER_ADDRESS`, `FLOW_ID`, and `LANGFLOW_API_KEY` with the values from your Langflow deployment.
```
curl --request POST \
  --url "http://LANGFLOW_SERVER_ADDRESS/api/v1/run/FLOW_ID" \
  --header "Content-Type: application/json" \
  --header "x-api-key: $LANGFLOW_API_KEY" \
  --data '{
  "input_value": "Hello",
  "output_type": "chat",
  "input_type": "chat",
  "session_id": "my_custom_session_value"
}'
```

The `my_custom_session_value` value is used in components that accept it, and the stored messages from this flow are stored in `langflow.db` with their respective `session_id` values.

## Retrieval of messages from memory by session ID

To retrieve messages from local Langflow memory, add a [**Message History** component](/message-history) to your flow.
The component accepts `sessionID` as a filter parameter, and uses the session ID value from upstream automatically to retrieve message history by session ID from storage.

Messages can be retrieved by `session_id` from the Langflow API at `GET /v1/monitor/messages`. For more information, see [Monitor endpoints](https://docs.langflow.org/api-monitor).

For an example of session ID in action, see [Use Session IDs in Langflow](https://www.youtube.com/watch?v=nJiF_eF21MY).

---

# Document: traces

_Source: 

---
title: Traces
slug: /traces
---


Langflow’s **Traces** feature records detailed execution traces for your flows and components so that you can debug issues, measure latency, and track token usage without relying on external observability services.

Trace data is stored in the Langflow database in the `trace` and `span` tables.
Trace data is presented in the **Flow Activity** and **Trace Details** pages in the UI, and can be retrieved from the `/monitor/traces` API endpoint.

Traces are enabled by default.
To disable Langflow tracing and use a different tracing provider, set `LANGFLOW_NATIVE_TRACING` to `false`.

## What traces capture

The tracer records:

- **Flow-level traces**: A trace for each flow run, including total runtime and status.
- **Component spans**: Spans for each component in the flow, including inputs, outputs, latency, and errors.
- **LangChain spans**: Deeper spans for chains, tools, retrievers, and LLM calls, including model name and token usage where available.

Each span includes:

- **Name** and **type** (for example, chain, LLM, tool, retriever)
- **Start and end time** and **latency (ms)**
- **Inputs and outputs** (serialized)
- **Error details**, if the span failed
- **Attributes** such as token counts and model metadata

## View traces in the UI

To view traces in the Langflow UI, do the following:
1. Run a flow, such as the Simple Agent starter flow in the [Quickstart](/get-started-quickstart).
2. Click  **Traces**.
   The **Flow Activity** page opens.
   Each flow run is displayed as a single trace of all of its spans.
   Flow runs can be sorted further by session ID, status, or time range.
   Optionally, click  **Download** to download a JSON file of that flow's trace to your local machine.
3. Click a flow run to open the **Trace Details** pane.
   The **Trace Details** pane displays spans for your flow run, including a flow-level span for the entire run, and a span for each component.
   Individual component spans include the component's inputs and outputs, timing, and token usage.

## Retrieve traces with the API

To programmatically query traces, use the `/monitor/traces` endpoints.
For full parameter details and code examples in Python, TypeScript, and curl, see [Monitor endpoints: Get traces](/api-monitor#get-traces).

## See also

- [Logs](/logging)
- [Monitor endpoints](/api-monitor)
