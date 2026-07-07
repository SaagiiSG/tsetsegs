I’ll fix the video stream endpoint so native HTML5 video can read metadata, buffer, and seek reliably.

Plan:
1. Update `stream-bluebook-video` CORS responses
   - Allow `GET`, `HEAD`, and `OPTIONS`.
   - Allow request headers needed by video elements, especially `Range`.
   - Expose playback headers back to the browser: `Content-Range`, `Accept-Ranges`, `Content-Length`, `Content-Type`, `ETag`, and `Last-Modified`.
   - Apply the same headers to success and error responses.

2. Harden byte-range handling
   - Forward the browser `Range` request upstream.
   - Preserve valid upstream `206 Partial Content` responses with exact `Content-Range` and partial `Content-Length`.
   - Return `206` for partial responses and `200` for full responses.
   - Support `HEAD` so browsers can probe metadata without downloading the full file.
   - Normalize/fallback missing playback headers so the video player can display duration when possible.

3. Fix environment URL generation if needed
   - Ensure `list-bluebook-videos` generates stream URLs against the current backend functions origin instead of a hardcoded backend URL pattern, so preview/custom domains don’t hit CORS or auth edge cases.

4. Verify with targeted checks
   - Call the stream endpoint with `Range: bytes=0-1` and confirm `206`, `Content-Range`, `Content-Length: 2`, and `Accept-Ranges: bytes`.
   - Confirm preflight/OPTIONS includes the required CORS headers.
   - Confirm the video element receives metadata and can show duration.