
---

# Document: agent

_Source: 

---
title: Connect applications to agents
slug: /agent-tutorial
---


This tutorial shows you how to connect a JavaScript application to a [Langflow agent](/agents).

With an agent, your application can use any connected tools to retrieve more contextual and timely data without changing any application code. The tools are selected by the agent's internal LLM to solve problems and answer questions.

## Prerequisites

* [Install and start Langflow](/get-started-installation)
* Create a [Langflow API key](/api-keys-and-authentication)
* Install the [Langflow JavaScript client](/typescript-client)
* Create an [OpenAI API key](https://platform.openai.com/api-keys)

This tutorial uses an OpenAI LLM. If you want to use a different provider, you need a valid credential for that provider.

## Create an agent flow

The following steps modify the **Simple Agent** template to connect a [**Directory** component](/directory) and a [**Web Search** component](/web-search) as tools for an **Agent** component.
The **Directory** component loads all files of a given type from a target directory on your local machine, and the **Web Search** component performs a DuckDuckGo search.
When connected to an **Agent** component as tools, the agent has the option to use these components when handling requests.

1. In Langflow, click **New Flow**, and then select the **Simple Agent** template.
2. Remove the **URL** and **Calculator** tools, and then add **Directory** and **Web Search** components to your flow.
3. In the **Directory** component's **Path** field, enter the directory path and file types that you want to make available to the **Agent** component.

    In this tutorial, the agent needs access to a record of customer purchases, so the directory name is `customer_orders` and the file type is `.csv`. Later in this tutorial, the agent will be prompted to find `email` values in the customer data.

    You can adapt the tutorial to suit your data, or, to follow along with the tutorial, you can download [`customer-orders.csv`](/files/customer_orders.csv) and save it in a `customer_orders` folder on your local machine.

4. In the **Directory** and **Web Search** [components' header menus](/concepts-components#component-menus), enable **Tool Mode** so you can use the components with an agent.

5. Connect the **Directory** and **Web Search** components' **Toolset** ports to the **Agent** component's **Tools** port.
6. In the **Agent** component, enter your OpenAI API key.

    If you want to use a different provider or model, edit the **Model Provider**, **Model Name**, and **API Key** fields accordingly.

7. To test the flow, click  **Playground**, and then ask the LLM a question, such as `Recommend 3 used items for carol.davis@example.com, based on previous orders.`

    Given the example prompt, the LLM would respond with recommendations and web links for items based on previous orders in `customer_orders.csv`.

    The **Playground** prints the agent's chain of thought as it selects tools to use and interacts with functionality provided by those tools.
    For example, the agent can use the **Directory** component's `as_dataframe` tool to retrieve a [DataFrame](/data-types#table), and the **Web Search** component's `perform_search` tool to find links to related items.

## Add a Prompt Template component to the flow

In this example, the application sends a customer's email address to the Langflow agent. The agent compares the customer's previous orders within the **Directory** component, searches the web for used versions of those items, and returns three results.

1. To include the email address as a value in your flow, add a [**Prompt Template** component](/components-prompts) to your flow between the **Chat Input** and **Agent** components.
2. In the **Prompt Template** component's **Template** field, enter `Recommend 3 used items for {email}, based on previous orders.`
Adding the `{email}` value in curly braces creates a new input in the **Prompt Template** component, and the component connected to the `{email}` port is supplying the value for that variable.
This creates a point for the user's email to enter the flow from your request.
If you aren't using the `customer_orders.csv` example file, modify the input to search for a value in your dataset.

    At this point your flow has six components. The **Chat Input** component is connected to the **Prompt Template** component's **email** input port. Then, the **Prompt Template** component's output is connected to the **Agent** component's **System Message** input port. The **Directory** and **Web Search** components are connected to the **Agent** component's **Tools** port. Finally, the **Agent** component's output is connected to the **Chat Output** component, which returns the final response to the application.

    ![An Agent component connected to Web Search and Directory components as tools](/img/tutorial-agent-with-directory.png)

## Send requests to your flow from a JavaScript application

With your flow operational, connect it to a JavaScript application to use the agent's responses.

1. To construct a JavaScript application to connect to your flow, gather the following information:

    * `LANGFLOW_SERVER_ADDRESS`: Your Langflow server's domain. The default value is `127.0.0.1:7860`. You can get this value from the code snippets on your flow's [**API access** pane](/concepts-publish#api-access).
    * `FLOW_ID`: Your flow's UUID or custom endpoint name. You can get this value from the code snippets on your flow's [**API access** pane](/concepts-publish#api-access).
    * `LANGFLOW_API_KEY`: A valid [Langflow API key](/api-keys-and-authentication).

2. Copy the following script into a JavaScript file, and then replace the placeholders with the information you gathered in the previous step.
If you're using the `customer_orders.csv` example file, you can run this example as-is with the example email address in the code sample.
If not, modify the `const email = "isabella.rodriguez@example.com"` to search for a value in your dataset.

    ```js
    import { LangflowClient } from "@datastax/langflow-client";

    const LANGFLOW_SERVER_ADDRESS = 'LANGFLOW_SERVER_ADDRESS';
    const FLOW_ID = 'FLOW_ID';
    const LANGFLOW_API_KEY = 'LANGFLOW_API_KEY';
    const email = "isabella.rodriguez@example.com";

    async function runAgentFlow(): Promise<void> {
        try {
            // Initialize the Langflow client
            const client = new LangflowClient({
                baseUrl: LANGFLOW_SERVER_ADDRESS,
                apiKey: LANGFLOW_API_KEY
            });

            console.log(`Connecting to Langflow server at: ${LANGFLOW_SERVER_ADDRESS} `);
            console.log(`Flow ID: ${FLOW_ID}`);
            console.log(`Email: ${email}`);

            // Get the flow instance
            const flow = client.flow(FLOW_ID);

            // Run the flow with the email as input
            console.log('\nSending request to agent...');
            const response = await flow.run(email, {
                session_id: email // Use email as session ID for context
            });

            console.log('\n=== Response from Langflow ===');
            console.log('Session ID:', response.sessionId);

            // Extract URLs from the chat message
            const chatMessage = response.chatOutputText();
            console.log('\n=== URLs from Chat Message ===');
            const messageUrls = chatMessage.match(/https?:\/\/[^\s"')\]]+/g) || [];
            const cleanMessageUrls = [...new Set(messageUrls)].map(url => url.trim());
            console.log('URLs from message:');
            cleanMessageUrls.slice(0, 3).forEach(url => console.log(url));

        } catch (error) {
            console.error('Error running flow:', error);

            // Provide error messages
            if (error instanceof Error) {
                if (error.message.includes('fetch')) {
                    console.error('\nMake sure your Langflow server is running and accessible at:', LANGFLOW_SERVER_ADDRESS);
                }
                if (error.message.includes('401') || error.message.includes('403')) {
                    console.error('\nCheck your API key configuration');
                }
                if (error.message.includes('404')) {
                    console.error('\nCheck your Flow ID - make sure it exists and is correct');
                }
            }
        }
    }

    // Run the function
    console.log('Starting Langflow Agent...\n');
    runAgentFlow().catch(console.error);
    ```

3.  Save and run the script to send the request and test the flow.

    Your application receives three URLs for recommended used items based on a customer's previous orders in your local CSV, all without changing any code.

    <details>
    <summary>Result</summary>

    The following is an example response from this tutorial's flow. Due to the nature of LLMs and variations in your inputs, your response might be different.

    ```
    Starting Langflow Agent...

    Connecting to Langflow server at: http://localhost:7860
    Flow ID: local-db-search
    Email: isabella.rodriguez@example.com

    Sending request to agent...

    === Response from Langflow ===
    Session ID: isabella.rodriguez@example.com

    URLs found:
    https://www.facebook.com/marketplace/258164108225783/electronics/
    https://www.facebook.com/marketplace/458332108944152/furniture/
    https://www.facebook.com/marketplace/613732137493719/kitchen-cabinets/
    ```

    </details>

4.  To quickly check traffic to your flow, open the **Playground**.
    New sessions are named after the user's email address.
    Keeping sessions distinct helps the agent maintain context. For more on session IDs, see [Session ID](/session-id).

## Next steps

For more information on building or extending this tutorial, see the following:

* [Model Context Protocol (MCP) servers](/mcp-server)
* [Langflow deployment overview](/deployment-overview)

---

# Document: chat-with-files

_Source: 

---
title: Create a chatbot that can ingest files
slug: /chat-with-files
---


This tutorial shows you how to build a chatbot that can read and answer questions about files you upload, such as meeting notes or job applications.

For example, you could upload a contract and ask, “What are the termination clauses in this agreement?” Or upload a resume and ask, “Does this candidate have experience with marketing analytics?”

The main focus of this tutorial is to show you how to provide files as input to a Langflow flow, so your chatbot can use the content of those files in its responses.

## Prerequisites

* [Install and start Langflow](/get-started-installation)
* Create a [Langflow API key](/api-keys-and-authentication)
* Create an [OpenAI API key](https://platform.openai.com/api-keys)

This tutorial uses an OpenAI LLM. If you want to use a different provider, you need a valid credential for that provider.

## Create a flow that accepts file input

To ingest files, your flow must have a **Read File** component attached to a component that receives input, such as a **Prompt Template** or **Agent** component.

The following steps modify the **Basic Prompting** template to accept file input:

1. In Langflow, click **New Flow**, and then select the **Basic Prompting** template.
2. In the **Language Model** component, enter your OpenAI API key.

    If you want to use a different provider or model, edit the **Model Provider**, **Model Name**, and **API Key** fields accordingly.

3. To verify that your API key is valid, click  **Playground**, and then ask the LLM a question.
The LLM should respond according to the specifications in the **Prompt Template** component's **Template** field.

4. Exit the **Playground**, and then modify the **Prompt Template** component to accept file input in addition to chat input.
To do this, edit the **Template** field, and then replace the default prompt with the following text:

    ```text
    ChatInput:
    {chat-input}
    File:
    {file}
    ```

    :::tip
    You can use any string to name your template variables.
    These strings become the names of the fields (input ports) on the **Prompt Template** component.

    For this tutorial, the variables are named after the components that connect to them: **chat-input** for the **Chat Input** component and **file** for the **Read File** component.
    :::

5. Add a [**Read File** component](/read-file) to the flow, and then connect the **Raw Content** output port to the **Prompt Template** component's **file** input port.
To connect ports, click and drag from one port to the other.

    You can add files directly to the **Read File** component to pre-load input before running the flow, or you can load files at runtime. The next section of this tutorial covers runtime file uploads.

    At this point your flow has five components. The **Chat Input** and **Read File** components are connected to the **Prompt Template** component's input ports. Then, the **Prompt Template** component's output port is connected to the **Language Model** component's input port. Finally, the **Language Model** component's output port is connected to the **Chat Output** component, which returns the final response to the user.

    ![File loader chat flow](/img/tutorial-chat-file-loader.png)

## Send requests to your flow from a Python application

This section of the tutorial demonstrates how you can send file input to a flow from an application.

To do this, your application must send a `POST /run` request to your Langflow server with the file you want to upload and a text prompt.
The result includes the outcome of the flow run and the LLM's response.

This example uses a local Langflow instance, and it asks the LLM to evaluate a sample resume.
If you don't have a resume on hand, you can download [fake-resume.txt](/files/fake-resume.txt).

:::tip
For an example of constructing file upload requests in JavaScript, see the [Create a vector RAG chatbot tutorial](/chat-with-rag#load-data-and-generate-embeddings).
:::

1. To construct the request, gather the following information:

    * `LANGFLOW_SERVER_ADDRESS`: Your Langflow server's domain. The default value is `127.0.0.1:7860`. You can get this value from the code snippets on your flow's [**API access** pane](/concepts-publish#api-access).
    * `FLOW_ID`: Your flow's UUID or custom endpoint name. You can get this value from the code snippets on your flow's [**API access** pane](/concepts-publish#api-access).
    * `FILE_COMPONENT_ID`: The UUID of the **Read File** component in your flow, such as `File-KZP68`. To find the component ID, open your flow in Langflow, click the **Read File** component, and then click **Controls**. The component ID is at the top of the **Controls** pane.
    * `CHAT_INPUT`: The message you want to send to the Chat Input of your flow, such as `Evaluate this resume for a job opening in my Marketing department.`
    * `FILE_NAME` and `FILE_PATH`: The name and path to the local file that you want to send to your flow.
    * `LANGFLOW_API_KEY`: A valid [Langflow API key](/api-keys-and-authentication).

2. Copy the following script into a Python file, and then replace the placeholders with the information you gathered in the previous step:

    ```python
    # Python example using requests
    import requests
    import json

    # 1. Set the upload URL
    url = "http://LANGFLOW_SERVER_ADDRESS/api/v2/files/"

    # 2. Prepare the file and payload
    payload = {}
    files = [
      ('file', ('FILE_PATH', open('FILE_NAME', 'rb'), 'application/octet-stream'))
    ]
    headers = {
      'Accept': 'application/json',
      'x-api-key': 'LANGFLOW_API_KEY'
    }

    # 3. Upload the file to Langflow
    response = requests.request("POST", url, headers=headers, data=payload, files=files)
    print(response.text)

    # 4. Get the uploaded file path from the response
    uploaded_data = response.json()
    uploaded_path = uploaded_data.get('path')

    # 5. Call the Langflow run endpoint with the uploaded file path
    run_url = "http://LANGFLOW_SERVER_ADDRESS/api/v1/run/FLOW_ID"
    run_payload = {
        "input_value": "CHAT_INPUT",
        "output_type": "chat",
        "input_type": "chat",
        "tweaks": {
            "FILE_COMPONENT_ID": {
                "path": uploaded_path
            }
        }
    }
    run_headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-key': 'LANGFLOW_API_KEY'
    }
    run_response = requests.post(run_url, headers=run_headers, data=json.dumps(run_payload))
    langflow_data = run_response.json()
    # Output only the message
    message = None
    try:
        message = langflow_data['outputs'][0]['outputs'][0]['results']['message']['data']['text']
    except (KeyError, IndexError, TypeError):
        pass
    print(message)

    ```

    This script contains two requests.

    The first request uploads a file, such as `fake-resume.txt`, to your Langflow server at the `/v2/files` endpoint. This request returns a file path that can be referenced in subsequent Langflow requests, such as `02791d46-812f-4988-ab1c-7c430214f8d5/fake-resume.txt`

    The second request sends a chat message to the Langflow flow at the `/v1/run/` endpoint.
    The `tweaks` parameter includes the path to the uploaded file as the variable `uploaded_path`, and sends this file directly to the **Read File** component.

3. Save and run the script to send the requests and test the flow.

    The initial output contains the JSON response object from the file upload endpoint, including the internal path where Langflow stores the file.
    Then, the LLM retrieves the file and evaluates its content, in this case the suitability of the resume for a job position.

    <details>
    <summary>Result</summary>

    The following is an example response from this tutorial's flow. Due to the nature of LLMs and variations in your inputs, your response might be different.

    ```
    {"id":"793ba3d8-5e7a-4499-8b89-d9a7b6325fee","name":"fake-resume (1)","path":"02791d46-812f-4988-ab1c-7c430214f8d5/fake-resume.txt","size":1779,"provider":null}
    The resume for Emily J. Wilson presents a strong candidate for a position in your Marketing department. Here are some key points to consider:

    ### Strengths:
    1. **Experience**: With over 8 years in marketing, Emily has held progressively responsible positions, culminating in her current role as Marketing Director. This indicates a solid foundation in the field.

    2. **Quantifiable Achievements**: The resume highlights specific accomplishments, such as a 25% increase in brand recognition and a 30% sales increase after launching new product lines. These metrics demonstrate her ability to drive results.

    3. **Diverse Skill Set**: Emily's skills encompass various aspects of marketing, including strategy development, team management, social media marketing, event planning, and data analysis. This versatility can be beneficial in a dynamic marketing environment.

    4. **Educational Background**: Her MBA and a Bachelor's degree in Marketing provide a strong academic foundation, which is often valued in marketing roles.

    5. **Certifications**: The Certified Marketing Professional (CMP) and Google Analytics Certification indicate a commitment to professional development and staying current with industry standards.

    ### Areas for Improvement:
    1. **Specificity in Skills**: While the skills listed are relevant, providing examples of how she has applied these skills in her previous roles could strengthen her resume further.

    2. **References**: While stating that references are available upon request is standard, including a couple of testimonials or notable endorsements could enhance credibility.

    3. **Formatting**: Ensure that the resume is visually appealing and easy to read. Clear headings and bullet points help in quickly identifying key information.

    ### Conclusion:
    Overall, Emily J. Wilson's resume reflects a well-rounded marketing professional with a proven track record of success. If her experience aligns with the specific needs of your Marketing department, she could be a valuable addition to your team. Consider inviting her for an interview to further assess her fit for the role.
    ```

    </details>

## Next steps

To continue building on this tutorial, try these next steps.

### Process multiple files loaded at runtime

To process multiple files in a single flow run, add a separate **Read File** component for each file you want to ingest. Then, modify your script to upload each file, retrieve each returned file path, and then pass a unique file path to each **Read File** component ID.

For example, you can modify `tweaks` to accept multiple **Read File** components.
The following code is just an example; it isn't working code:

```python
## set multiple file paths
file_paths = {
    FILE_COMPONENT_1: uploaded_path_1,
    FILE_COMPONENT_2: uploaded_path_2
}

def chat_with_flow(input_message, file_paths):
    """Compare the contents of these two files."""
    run_url = f"{LANGFLOW_SERVER_ADDRESS}/api/v1/run/{FLOW_ID}"
    # Prepare tweaks with both file paths
    tweaks = {}
    for component_id, file_path in file_paths.items():
        tweaks[component_id] = {"path": file_path}
```

You can also use a [**Directory** component](/directory) to load all files in a directory or pass an archive file to the **Read File** component.

### Upload external files at runtime

To upload files from another machine that isn't your local environment, your Langflow server must first be accessible over the internet. Then, authenticated users can upload files to your public Langflow server's `/v2/files/` endpoint, as shown in the tutorial. For more information, see [Langflow deployment overview](/deployment-overview).

### Preload files outside the chat session

You can use the **Read File** component to load files anywhere in a flow, not just in a chat session.

In the visual editor, you can preload files to the **Read File** component by selecting them from your local machine or [Langflow file management](/concepts-file-management).

For example, you can preload an instructions file for a prompt template, or you can preload a vector store with documents that you want to query in a Retrieval Augmented Generation (RAG) flow.

For more information about the **Read File** component and other data loading components, see the [**Read File** component](/read-file).

---

# Document: chat-with-rag

_Source: 

---
title: Create a vector RAG chatbot
slug: /chat-with-rag
---


This tutorial demonstrates how you can use Langflow to create a chatbot application that uses Retrieval Augmented Generation (RAG) to embed your data as vectors in a vector database, and then chat with the data.

## Prerequisites

* [Install and start Langflow](/get-started-installation)
* Create a [Langflow API key](/api-keys-and-authentication)
* Create an [OpenAI API key](https://platform.openai.com/api-keys)
* Install the [Langflow JavaScript client](/typescript-client)
* Be familiar with vector search concepts and applications, such as vector databases and RAG

## Create a vector RAG flow

1. In Langflow, click **New Flow**, and then select the **Vector Store RAG** template.

    <details>
    <summary>About the Vector Store RAG template</summary>

    This template has two flows.

    The **Load Data Flow** populates a vector store with data from a file.
    This data is used to respond to queries submitted to the **Retriever Flow**.

    Specifically, the **Load Data Flow** ingests data from a local file, splits the data into chunks, loads and indexes the data in your vector database, and then computes embeddings for the chunks. The embeddings are also stored with the loaded data. This flow only needs to run when you need to load data into your vector database.

    The **Retriever Flow** receives chat input, generates an embedding for the input, and then uses several components to reconstruct chunks into text and generate a response by comparing the new embedding to the stored embeddings to find similar data.

    </details>

2. Add your **OpenAI** API key to both **OpenAI Embeddings** components.

3. Optional: Replace both **Astra DB** vector store components with a **Chroma DB** or another vector store component of your choice.
This tutorial uses Chroma DB.

    The **Load Data Flow** should have **Read File**, **Split Text**, **Embedding Model**, vector store (such as **Chroma DB**), and **Chat Output** components:

    ![File loader chat flow](/img/tutorial-chatbot-embed-files.png)

    The **Retriever Flow** should have **Chat Input**, **Embedding Model**, vector store, **Parser**, **Prompt**, **Language Model**, and **Chat Output** components:

    ![Chat with RAG flow](/img/tutorial-chatbot-chat-flow.png)

    The flows are ready to use.
    Continue the tutorial to learn how to use the loading flow to load data into your vector store, and then call the chat flow in a chatbot application.

## Load data and generate embeddings

To load data and generate embeddings, you can use the visual editor or the `/v2/files` endpoint.

The visual editor option is simpler, but it is only recommended for scenarios where the user who created the flow is the same user who loads data into the database.

In situations where many users load data or you need to load data programmatically, use the Langflow API option.




1. In your RAG chatbot flow, click the **Read File** component, and then click **File**.
2. Select the local file you want to upload, and then click **Open**.
    The file is loaded to your Langflow server.
3. To load the data into your vector database, click the vector store component, and then click  **Run component** to run the selected component and all prior dependent components.




To load data programmatically, use the `/v2/files/` and `/v1/run/$FLOW_ID` endpoints. The first endpoint loads a file to your Langflow server, and then returns an uploaded file path. The second endpoint runs the **Load Data Flow**, referencing the uploaded file path, to chunk, embed, and load the data into the vector store.

:::tip
For an example of constructing file upload requests in Python, see the [Create a chatbot that can ingest files tutorial](/chat-with-files#send-requests-to-your-flow-from-a-python-application).
:::

The following script demonstrates this process.

```js
// Node 18+ example using global fetch, FormData, and Blob

// 1. Prepare the form data with the file to upload
const fileBuffer = await fs.readFile('FILE_NAME');
const data = new FormData();
data.append('file', new Blob([fileBuffer]), 'FILE_NAME');
const headers = { 'x-api-key': 'LANGFLOW_API_KEY' };

// 2. Upload the file to Langflow
const uploadRes = await fetch('LANGFLOW_SERVER_ADDRESS/api/v2/files/', {
  method: 'POST',
  headers,
  body: data
});
const uploadData = await uploadRes.json();
const uploadedPath = uploadData.path;

// 3. Call the Langflow run endpoint with the uploaded file path
const payload = {
  input_value: "Analyze this file",
  output_type: "chat",
  input_type: "text",
  tweaks: {
    'FILE_COMPONENT_NAME': {
      path: uploadedPath
    }
  }
};
const runRes = await fetch('LANGFLOW_SERVER_ADDRESS/api/v1/run/FLOW_ID', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': 'LANGFLOW_API_KEY' },
  body: JSON.stringify(payload)
});
const langflowData = await runRes.json();
// Output only the message
console.log(langflowData.outputs?.[0]?.outputs?.[0]?.results?.message?.data?.text);
```




When the flow runs, the flow ingests the selected file, chunks the data, loads the data into the vector store database, and then generates embeddings for the chunks, which are also stored in the vector store.

Your database now contains data with vector embeddings that an LLM can use as context to respond to queries, as demonstrated in the next section of the tutorial.

## Chat with your flow from a JavaScript application

To chat with the data in your vector database, create a chatbot application that runs the **Retriever Flow** programmatically.

This tutorial uses JavaScript for demonstration purposes.

1. To construct the chatbot, gather the following information:

    * `LANGFLOW_SERVER_ADDRESS`: Your Langflow server's domain. The default value is `127.0.0.1:7860`. You can get this value from the code snippets on your flow's [**API access** pane](/concepts-publish#api-access).
    * `FLOW_ID`: Your flow's UUID or custom endpoint name. You can get this value from the code snippets on your flow's [**API access** pane](/concepts-publish#api-access).
    * `LANGFLOW_API_KEY`: A valid [Langflow API key](/api-keys-and-authentication).

2. Copy the following script into a JavaScript file, and then replace the placeholders with the information you gathered in the previous step:

    ```js
    const readline = require('readline');
    const { LangflowClient } = require('@datastax/langflow-client');

    # pragma: allowlist nextline secret
    const API_KEY = 'LANGFLOW_API_KEY';
    const SERVER = 'LANGFLOW_SERVER_ADDRESS';
    const FLOW_ID = 'FLOW_ID';

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    // Initialize the Langflow client
    const client = new LangflowClient({
        baseUrl: SERVER,
        apiKey: API_KEY
    });

    async function sendMessage(message) {
        try {
            const response = await client.flow(FLOW_ID).run(message, {
                session_id: 'user_1'
            });

            // Use the convenience method to get the chat output text
            return response.chatOutputText() || 'No response';
        } catch (error) {
            return `Error: ${error.message}`;
        }
    }

    function chat() {
        console.log('🤖 Langflow RAG Chatbot (type "quit" to exit)\n');

        const ask = () => {
            rl.question('👤 You: ', async (input) => {
                if (['quit', 'exit', 'bye'].includes(input.trim().toLowerCase())) {
                    console.log('👋 Goodbye!');
                    rl.close();
                    return;
                }

                const response = await sendMessage(input.trim());
                console.log(`🤖 Assistant: ${response}\n`);
                ask();
            });
        };

        ask();
    }

    chat();
    ```

    The script creates a Node application that chats with the content in your vector database, using the `chat` input and output types to communicate with your flow.
    Chat maintains ongoing conversation context across multiple messages. If you used `text` type inputs and outputs, each request is a standalone text string.

    :::tip
    The [Langflow TypeScript client](/typescript-client) has a `chatOutputText()` convenience method that simplifies working with Langflow's complex JSON response structure.
    Instead of manually navigating through multiple levels of nested objects with `data.outputs[0].outputs[0].results.message.data.text`, the client automatically extracts the message text and handles potentially undefined values gracefully.
    :::

3. Save and run the script to send the requests and test the flow.

    <details>
    <summary>Result</summary>

    The following is an example response from this tutorial's flow. Due to the nature of LLMs and variations in your inputs, your response might be different.

    ```
    👤 You: Do you have any documents about engines?
    🤖 Assistant: Yes, the provided text contains several warnings and guidelines related to engine installation, maintenance, and selection. It emphasizes the importance of using the correct engine for specific applications, ensuring all components are in good condition, and following safety precautions to prevent fire or explosion. If you need more specific information or details, please let me know!

    👤 You: It should be about a Briggs and Stratton engine.
    🤖 Assistant: The text provides important safety and installation guidelines for Briggs & Stratton engines. It emphasizes that these engines should not be used on 3-wheel All-Terrain Vehicles (ATVs), motor bikes, aircraft products, or vehicles intended for competitive events, as such uses are not approved by Briggs & Stratton.

    If you have any specific questions about Briggs & Stratton engines or need further information, feel free to ask!
    ```

    </details>

## Next steps

For more information on building or extending this tutorial, see the following:

* [Model Context Protocol (MCP) servers](/mcp-server)
* [Langflow deployment overview](/deployment-overview)

---

# Document: mcp-tutorial

_Source: 

---
title: Connect to MCP servers from your application
slug: /mcp-tutorial
---


This tutorial shows you how to connect MCP servers to your applications using Langflow's [**MCP Tools** component](/mcp-client).

The [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) helps agents integrate with LLMs through _MCP clients_ and _MCP servers_.
Specifically, MCP servers host tools that agents (MCP clients) use to complete specialized tasks.
MCP servers are connected to MCP clients like Cursor.
Then, you interact with the client, and the client uses tools from the connected servers as needed to complete your requests.

You can run Langflow as an MCP client and an MCP server:

* [Use Langflow as an MCP client](/mcp-client): When run as an MCP client, an **Agent** component in a Langflow flow can use connected components as tools to handle requests.
You can use existing components as tools, and you can connect any MCP server to your flow to make that server's tools available to the agent.

* [Use Langflow as an MCP server](/mcp-server): When run as an MCP server, your flows become tools that can be used by an MCP client, which could be an external client or another Langflow flow.

In this tutorial, you will use the Langflow **MCP Tools** component to connect multiple MCP servers to your flow, and then you'll use a Python application to run your flow and chat with the agent programmatically.

## Prerequisites

* [Install and start Langflow](/get-started-installation)
* Create a [Langflow API key](/api-keys-and-authentication)
* Create an [OpenAI API key](https://platform.openai.com/api-keys)

This tutorial uses an OpenAI LLM. If you want to use a different provider, you need a valid credential for that provider.

## Create an agent flow

1. In Langflow, click **New Flow**, and then select the **Simple Agent** template.

2. In the **Agent** component, enter your OpenAI API key.

    If you want to use a different provider or model, edit the **Model Provider**, **Model Name**, and **API Key** fields accordingly.

3. To test the flow, click  **Playground**, and then ask the LLM `Is it safe to go hiking in the Adirondacks today?`

    This query demonstrates how an LLM, by itself, might not have access to information or functions designed to address specialized queries. In this example, the default OpenAI model provides a vague response, although the agent does know the current date by using its internal `get_current_date` function.

    ```text
    Today is July 11, 2025.
    To determine if it's safe to go hiking in the Adirondacks today, you should check the current weather conditions, trail advisories, and any local alerts (such as bear activity or flooding).
    Would you like a detailed weather forecast or information on trail conditions for the Adirondacks today?
    ```

    To improve the response, you can connect MCP servers to your flow that provide specialized tools for the agent to use when generating responses. In the next part of this tutorial, you'll connect an MCP server that provides the agent with real-time weather information so that it can generate a more specific response.

## Add an MCP Tools component

There are many MCP servers available online that offer different tools for different tasks.
To use an MCP server with an MCP client, you have to make the server available to the client.
With all MCP clients, there are several ways to do this:

* Install the server locally.
* Use `uvx` or `npx` to fetch and run a server package.
* Call a server running remotely, like those available on Smithery.

This tutorial demonstrates how to install a weather server locally with `uv pip install`, and how to use `npx` to run the geolocation server package.
Your particular MCP server's requirements may vary.

In Langflow, you use the **MCP Tools** component to connect a specific MCP server to a flow.
You need one **MCP Tools** component for each MCP server that you want your flow to use.

1. For this tutorial, install a [weather MCP server](https://github.com/isdaniel/mcp_weather_server) on your local machine with uv and Python:

    ```shell
    uv pip install mcp_weather_server
    ```

    Make sure you install the server in the same Python environment where Langflow is running:

    * Langflow in a virtual environment: Activate the environment before installing the server.
    * Langflow Docker image: Install the server inside the Docker container.
    * Langflow Desktop or system-wide Langflow OSS: Install the server globally or in the same user environment where you run Langflow.

2. In your **Simple Agent** flow, remove the **URL** and **Calculator** tools.

3. Open the  **MCP** section in the left sidebar, click  **Add MCP Server**, and register the weather MCP server.

4. In the **Add MCP Server** pane, provide the server startup command and arguments to connect the weather MCP server to your flow. For this tutorial, use either the **JSON** or **STDIO** option.

    Langflow runs the command to launch the server when the agent determines that it needs to use a tool provided by that server.

    Notice that both configurations provide the same information but in different formats.
    This means that if your MCP server repository only provides a JSON file for the server, you can still use those values with the STDIO option.

    
    

    To provide the MCP server configuration as a JSON object, select **JSON**, and then paste the server configuration into the **JSON** field:

    ```json
    {
      "mcpServers": {
        "weather": {
          "command": "python",
          "args": [
            "-m",
            "mcp_weather_server"
          ],
          "disabled": false,
          "autoApprove": []
        }
      }
    }
    ```

    
    

    To provide the MCP server configuration in a GUI format, select **STDIO**, and then enter the MCP server configuration values into the given fields:

    - **Name**: `weather`
    - **Command**: `python`
    - **Arguments**:
      - `-m`
      - `mcp_weather_server`

    
    

5. Click **Add Server**, and then wait for the **Actions** list to populate. This means that the MCP server successfully connected.

6. Drag the weather MCP server from the **MCP** sidebar onto the canvas to add the [**MCP Tools**](/mcp-client) component for that server.

    With this weather server, the **MCP Tools** component also adds an optional **City** field.
    For this tutorial, don't enter anything in this field.
    Instead, you will add a geolocation MCP server in the next step, which the agent will use to detect your location.

7. Click the **MCP Tools** component, enable **Tool Mode** in the [component's header menu](/concepts-components#component-menus), and then connect the component's **Toolset** port to the **Agent** component's **Tools** port.

    At this point your flow has four connected components:

    * The **Chat Input** component is connected to the **Agent** component's **Input** port. This allows to flow to be triggered by an incoming prompt from a user or application.
    * The **MCP Tools** component with the weather MCP server is connected to the **Agent** component's **Tools** port. The agent may not use this server for every request; the agent only uses this connection if it decides the server can help respond to the prompt.
    * The **Agent** component's **Output** port is connected to the **Chat Output** component, which returns the final response to the user or application.

    ![An Agent component connected to an MCP weather server](/img/tutorial-mcp-weather.png)

8. To test the weather MCP server, click  **Playground**, and then ask the LLM `Is it safe to go hiking in the Adirondacks today?`

    The **Playground** shows you the agent's logic as it analyzes the request and select tools to use.

    Ideally, the agent's response will be more specific than the previous response because of the additional context provided by the weather MCP server.
    For example:

    ```text
    The current weather in Lake Placid, a central location in the Adirondacks,
    is foggy with a temperature of 17.2°C (about 63°F).
    If you plan to go hiking today, be cautious as fog can reduce visibility
    on trails and make navigation more difficult.
    ```

    This is a better response, but what makes this MCP server more valuable than just calling a weather API?

    MCP servers are often customized for specific tasks, such as highly specialized actions or chained tools for complex, multi-step problem solving.
    Typically, you would have to write a custom script for a specific task, possibly including multiple API calls in a single script, and then you would have to either execute this script outside the context of the agent or provide it to your agent in some way.

    Instead, the MCP ensures that all MCP servers are added to agents in the same way, without having to know each server's specific endpoint structures or write custom integrations.
    The MCP is a standardized way to integrate many diverse tools into agentic applications.
    You don't have to learn a new API or write custom code every time you want to use a new MCP server.

    Additionally, you can attach many MCP servers to one agent, depending on the problems you want your application to solve.
    The more servers you add, the more specialized context the agent can use in its responses.
    In this tutorial, adding the weather MCP server already improved the quality of the LLM's response.
    In the next section of the tutorial, you will add a `ip_geolocation` MCP server so the agent can detect the user's location if they don't specify a location in their prompt.

## Add a geolocation server

The [Toolkit MCP server](https://github.com/cyanheads/toolkit-mcp-server) includes multiple MCP tools for network monitoring, including IP geolocation. It isn't extremely precise, but it doesn't require an API key.

Note that this tool returns the IP geolocation of your Langflow server, so if your server is deployed remotely, consider alternative approaches for getting user-specific location data, such as browser geolocation APIs.

This MCP server can be started with one [npx](https://docs.npmjs.com/cli/v8/commands/npx) command, which downloads and runs the [Toolkit MCP server Node registry package](https://www.npmjs.com/package/@cyanheads/toolkit-mcp-server) without installing the package locally.

To add the Toolkit MCP server to your flow, do the following:

1. Open the  **MCP** sidebar, click  **Add MCP Server**, and register a second server.

2. Select **STDIO**.

3. For **Name**, enter `ip_geolocation`.

    :::tip
    The tool name and description help the agent select tools.
    If your agent is struggling to select tools, make sure the names and descriptions are clear and human-readable.
    :::

4. For **Command**, enter `npx @cyanheads/toolkit-mcp-server`.

5. Click **Add Server**, and then wait for the **Actions** list to populate. This means that the MCP server successfully connected.

6. Drag the **ip_geolocation** MCP server from the **MCP** sidebar to the canvas to add the second **MCP Tools** component.

7. Click the new **MCP Tools** component, enable **Tool Mode** in the [component's header menu](/concepts-components#component-menus), and then connect the component's **Toolset** port to the **Agent** component's **Tools** port.

    Your flow now has an additional **MCP Tools** component for a total of five components.

    ![An Agent component connected to MCP weather and geolocation servers](/img/tutorial-mcp-geolocation.png)

## Create a Python application that connects to Langflow

At this point, you can open the **Playground** and ask about the weather in your current location to test the IP geolocation tool.
However, geolocation tools are most useful in applications where you or your users want to ask about the weather from different places around the world.

In the last part of this tutorial, you'll learn how to use the Langflow API to run a flow in a script.
This could be part of a larger application, such as a mobile app where users want to know if the weather is good for a particular sport.

When you use the Langflow API to run a flow, you can change some aspects of the flow without changing the code.
For example, you can add more MCP servers to your flow in Langflow, and then use the same script to run the flow.
You can use the same input or a new input that prompts the agent to use other tools.

1. For this tutorial's Python script, gather the following information:

    * `LANGFLOW_SERVER_ADDRESS`: Your Langflow server's domain. The default value is `127.0.0.1:7860`. You can get this value from the code snippets on your flow's [**API access** pane](/concepts-publish#api-access).
    * `FLOW_ID`: Your flow's UUID or custom endpoint name. You can get this value from the code snippets on your flow's [**API access** pane](/concepts-publish#api-access).
    * `LANGFLOW_API_KEY`: A valid [Langflow API key](/api-keys-and-authentication).

2. Copy the following script into a Python file, and then replace the placeholders with the information you gathered in the previous step:

    ```python
    import requests
    import os

    url = "LANGFLOW_SERVER_ADDRESS/api/v1/run/FLOW_ID"  # The complete API endpoint URL for this flow

    # Request payload configuration
    payload = {
        "output_type": "chat",
        "input_type": "chat",
        "input_value": "What's the weather like where I am right now?"
    }

    # Request headers
    headers = {
        "Content-Type": "application/json",
        "x-api-key": "LANGFLOW_API_KEY"
    }

    try:
        # Send API request
        response = requests.request("POST", url, json=payload, headers=headers)
        response.raise_for_status()  # Raise exception for bad status codes

        # Parse and print only the message text
        data = response.json()
        message = data["outputs"][0]["outputs"][0]["results"]["message"]["text"]
        print(message)

    except requests.exceptions.RequestException as e:
        print(f"Error making API request: {e}")
    except ValueError as e:
        print(f"Error parsing response: {e}")
    except (KeyError, IndexError) as e:
        print(f"Error extracting message from response: {e}")
    ```

    Notice that this script uses a different prompt than the previous **Playground** examples.
    In this script, the `input_value` asks about the weather in the user's current location without providing any hints about the user's location, such as a particular city.

    Additionally, this script includes parsing code to extract the LLM's reply from the entire Langflow API response.
    You will want to use similar extraction in your own applications because the Langflow API response includes metadata and other information that isn't relevant to the reply passed to the user.

3.  Save and run the script to send the request and test the flow.

    The agent uses the `ip_geolocation` tool to detect the requester's location, and then it uses the `weather` tool to retrieve weather information for that location.
    For example:

    ```text
    The weather in Waynesboro, Pennsylvania, is currently overcast with a temperature of 23.0°C (about 73.4°F).
    If you need more details or have any other questions, feel free to ask!
    ```

    Remember, the `ip_geolocation` tool used in this tutorial uses your Langflow server's location, which can be different from your actual location.

## Next steps

To continue building on the concepts introduced in this tutorial, see the following:

* [Use Langflow as an MCP client](/mcp-client)
* [Use Langflow Agents](/agents)
* [Use Langflow as an MCP server](/mcp-server)
* [Langflow deployment overview](/deployment-overview)
