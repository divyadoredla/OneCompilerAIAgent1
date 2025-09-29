from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import os
from langchain_ollama import OllamaLLM
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import json
import requests

# Logging setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:8000"}})

# Ollama setup (for both chat and agent parsing)
ollama_available = False
try:
    # Verify Ollama server is running
    response = requests.get('http://localhost:11434/api/tags', timeout=5)
    if response.status_code == 200 and 'llama3' in response.text:
        llm = OllamaLLM(model="llama3")
        ollama_available = True
        logger.info("Successfully initialized Ollama LLM (llama3)")
    else:
        logger.warning("Ollama server running but llama3 model not found")
except Exception as e:
    logger.error(f"Failed to initialize Ollama: {str(e)}")

parse_prompt = PromptTemplate(
    input_variables=["command"],
    template="Parse this user command into JSON steps for browser automation: {command}. "
             "Output format: {'url': 'starting URL', 'actions': [{'type': 'search|click|extract', 'selector': 'CSS selector', 'value': 'text to input/expect'}]}"
)

def execute_browser_steps(steps, command):
    """Execute parsed steps in headless Chrome with Selenium."""
    results = []
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # Run headless
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")

    # Initialize ChromeDriver with webdriver-manager
    try:
        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
        logger.info("Selenium ChromeDriver initialized")
    except Exception as e:
        logger.error(f"Failed to initialize ChromeDriver: {str(e)}")
        return {'extracted_data': [f"Browser error: {str(e)}"]}

    try:
        url = steps.get('url', 'https://www.amazon.in')
        driver.get(url)
        logger.info(f"Navigated to {url}")
        WebDriverWait(driver, 30).until(EC.presence_of_element_located((By.TAG_NAME, "body")))

        for action in steps.get('actions', []):
            logger.info(f"Executing action: {action}")
            try:
                if action['type'] == 'search':
                    element = WebDriverWait(driver, 10).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, action['selector']))
                    )
                    element.clear()
                    element.send_keys(action['value'])
                    element.send_keys('\n')  # Press Enter
                    WebDriverWait(driver, 30).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
                elif action['type'] == 'extract':
                    elements = driver.find_elements(By.CSS_SELECTOR, action['selector'])
                    data = [el.text.strip() for el in elements if el.text.strip()]
                    results.extend(data[:5])
                time.sleep(3)  # Rate limiting
            except Exception as e:
                logger.error(f"Action failed: {str(e)}")
                results.append(f"Error in action {action['type']}: {str(e)}")

        # Fallback: Generic Amazon search
        if not results and 'amazon' in command.lower():
            logger.info("Falling back to generic Amazon search")
            try:
                element = WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, 'input#twotabsearchtextbox'))
                )
                element.clear()
                element.send_keys(command.replace('search for', '').replace('on amazon', '').strip())
                element.send_keys('\n')
                WebDriverWait(driver, 30).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
                elements = driver.find_elements(By.CSS_SELECTOR, '.s-result-item')
                data = []
                for el in elements[:5]:
                    title = el.find_element(By.CSS_SELECTOR, '.a-link-normal:not(.s-sponsored-label-text)') if el.find_elements(By.CSS_SELECTOR, '.a-link-normal:not(.s-sponsored-label-text)') else None
                    price = el.find_element(By.CSS_SELECTOR, '.a-price .a-offscreen') if el.find_elements(By.CSS_SELECTOR, '.a-price .a-offscreen') else None
                    if title and price:
                        data.append(f"{title.text.strip()} - {price.text.strip()}")
                results.extend(data[:5])
            except Exception as e:
                logger.error(f"Fallback search failed: {str(e)}")
                results.append(f"Fallback error: {str(e)}")

    except Exception as e:
        logger.error(f"Browser automation failed: {str(e)}")
        results.append(f"Browser error: {str(e)}")
    finally:
        driver.quit()

    return {'extracted_data': results}

@app.route('/')
def index():
    logger.info("Received request to root endpoint")
    return jsonify({'message': 'OneCompiler AI Web Agent Backend. Use /api/generate for chat, /api/agent for web tasks.'})

@app.route('/api/generate', methods=['POST'])
def generate_response():
    logger.info("Received request to /api/generate")
    data = request.json
    prompt = data.get('prompt')
    if not prompt:
        logger.warning("No prompt provided")
        return jsonify({'error': 'No prompt provided'}), 400
    
    if not ollama_available:
        logger.error("Ollama not available, no fallback configured")
        return jsonify({'error': 'Ollama not available'}), 500

    try:
        parse_chain = LLMChain(llm=llm, prompt=PromptTemplate(input_variables=["prompt"], template="{prompt}"))
        response = parse_chain.run(prompt=prompt)
        logger.info("Generated Ollama response")
        return jsonify({'content': response.strip()})
    except Exception as e:
        logger.error(f"Ollama API error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/agent', methods=['POST'])
def web_agent():
    logger.info("Received request to /api/agent")
    data = request.json
    command = data.get('command')
    if not command:
        logger.warning("No command provided")
        return jsonify({'error': 'No command provided'}), 400
    
    try:
        if not ollama_available:
            logger.warning("Ollama unavailable, using fallback")
            # Fallback parsing
            steps = {
                'url': 'https://www.amazon.in' if 'amazon' in command.lower() else 'https://www.google.com',
                'actions': [
                    {'type': 'search', 'selector': 'input#twotabsearchtextbox' if 'amazon' in command.lower() else 'input[name="q"]', 'value': command.replace('search for', '').replace('on amazon', '').strip()},
                    {'type': 'extract', 'selector': '.s-result-item .a-link-normal:not(.s-sponsored-label-text)' if 'amazon' in command.lower() else 'h3', 'value': ''}
                ]
            }
        else:
            # Parse command with Ollama
            parse_chain = LLMChain(llm=llm, prompt=parse_prompt)
            parsed = parse_chain.run(command=command)
            steps = json.loads(parsed)
        logger.info(f"Parsed steps for '{command}': {steps}")
        
        # Execute browser automation
        extracted = execute_browser_steps(steps, command)
        
        # Structure output
        structured = {
            'command': command,
            'results': extracted['extracted_data'],
            'summary': f"Found {len([r for r in extracted['extracted_data'] if not r.startswith('Error')])} results for your query."
        }
        logger.info("Agent execution successful")
        return jsonify(structured)
    except json.JSONDecodeError:
        logger.error("Failed to parse LLM output, using fallback")
        steps = {
            'url': 'https://www.amazon.in' if 'amazon' in command.lower() else 'https://www.google.com',
            'actions': [
                {'type': 'search', 'selector': 'input#twotabsearchtextbox' if 'amazon' in command.lower() else 'input[name="q"]', 'value': command.replace('search for', '').replace('on amazon', '').strip()},
                {'type': 'extract', 'selector': '.s-result-item .a-link-normal:not(.s-sponsored-label-text)' if 'amazon' in command.lower() else 'h3', 'value': ''}
            ]
        }
        extracted = execute_browser_steps(steps, command)
        structured = {
            'command': command,
            'results': extracted['extracted_data'],
            'summary': f"Found {len([r for r in extracted['extracted_data'] if not r.startswith('Error')])} results for your query."
        }
        return jsonify(structured)
    except Exception as e:
        logger.error(f"Agent error: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logger.info("Starting Flask server on http://0.0.0.0:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)