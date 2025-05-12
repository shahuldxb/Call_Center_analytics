from azure.core.credentials import AzureKeyCredential
from azure.ai.textanalytics import TextAnalyticsClient

text_analytics_endpoint = "https://languagecenter-ivr.cognitiveservices.azure.com/"
text_analytics_key = "DmeqkR5UXieB1BBxdCvcqitBbEGfEnhAEV4O8Mv2H79nfMMT2V3PJQQJ99BCACYeBjFXJ3w3AAAaACOGQpNI"

text_analytics_client = TextAnalyticsClient(endpoint=text_analytics_endpoint, credential=AzureKeyCredential(text_analytics_key))

def generateSummary(text_documents,text_analytics_client):
    print("text documents:",text_documents)
    if not text_documents:
        return {"abstract_summary": "", "extract_summary": ""}
    poller_abstract = text_analytics_client.begin_abstract_summary(text_documents)
    abstract_summary_results = poller_abstract.result()
    # Generate Extract Summary
    poller_extract = text_analytics_client.begin_extract_summary(text_documents)
    extract_summary_results = poller_extract.result()
    abstract_summaries = []
    extract_summaries = []
    for result in abstract_summary_results:
        if result.kind == "AbstractiveSummarization":
            # Extract only the first 3 sentences for a shorter summary
            abstract_summary = " ".join([summary.text for summary in result.summaries])  # Limit to 3 lines
            abstract_summaries.append(abstract_summary)
        elif result.is_error is True:
            return f"Error: {result.error.code} - {result.error.message}"
    for result in extract_summary_results:
        print("Extractive Summary API Raw Response:", result)  # Debugging
        if result.kind == "ExtractiveSummarization":
            lst_sentences = [sentence.text for sentence in result.sentences]  # No limit
            extract_summary = "\n".join(lst_sentences)
            print("Extractive Summary (Processed):", extract_summary)  # Debugging
            extract_summaries.append(extract_summary)
        elif result.is_error is True:
            return f"Error: {result.error.code} - {result.error.message}"


    return {"abstract_summaries": abstract_summaries, "extract_summaries": extract_summaries}

   

