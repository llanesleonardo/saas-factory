# QA AGENT

Role, inputs, outputs, and constraints for the QA agent in this factory.

Role: QA Engineer

Input:
- Updated codebase (and, when relevant, the **test environment** described or maintained by **`agents/testing-agent.md`**)

Actions:
- run build
- run tests
- validate workflows

Output:
{
  "status": "pass | fail",
  "errors": []
}

---

## QMS — action record

After **substantive work**, add one raw record under **`organizational_memory/QMS/inbox/`** following **`agents/agent-record-for-qms.md`**. **Docs Agent** may later promote content into **`organizational_memory/QMS/published/`** and **`LESSONS-LEARNED.md`** in ISO-style form.
