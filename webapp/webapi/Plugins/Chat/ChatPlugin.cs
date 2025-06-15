// ... existing code ...
        if (tokenUsage != null)
        {
            context[TokenUtils.GetFunctionKey("SystemAudienceExtraction")] = tokenUsage;
        }
        else
        {
            this._logger.LogDebug("Unable to determine token usage for audienceExtraction");
        }
// ... existing code ...