# Rooted Application keyword study-text campaign

Prepared November 5, 2026. This is the proposed one-church pilot registration copy for the Twilio A2P campaign. Do not submit it as a functioning program until the new backend/frontend images, migration 030, approved Messaging Service, and signed incoming webhook are active. The public pages are built locally but not yet deployed.

## Keyword and published proof

- Program invitation: `https://rooted-together.com/sms` — “Text ROOTED to +1 (803) 770-5549 to request recurring Rooted Application Bible study texts. Reply AGREE to confirm.”
- Privacy Policy: `https://rooted-together.com/privacy`.
- Terms & Conditions: `https://rooted-together.com/terms`.
- The privacy and terms pages identify Rooted Application as a sole-proprietor-operated service and give `rooted-together@outlook.com` as the contact. The operator should review the actual data practices and public copy before deploying or submitting to Twilio.

## Message flow field

> People visit https://rooted-together.com/sms, where Rooted Application invites them to text ROOTED to +1 (803) 770-5549. The page displays the Privacy Policy and Terms & Conditions links, says message frequency varies by church, that message and data rates may apply, and explains STOP and HELP. The person sends ROOTED from their own handset. Rooted replies: “Rooted Application: Reply AGREE within 24 hours to receive recurring Bible study texts and public study links. Message frequency varies by church. Message and data rates may apply. Reply STOP to unsubscribe or HELP for help. Privacy: https://rooted-together.com/privacy Terms: https://rooted-together.com/terms”. The person is not enrolled until they reply AGREE within 24 hours. Rooted records the signed inbound message IDs, request and confirmation time, sender program and consent version. Rooted then replies: “Rooted Application: You are subscribed to study texts. Message frequency varies by church. Reply STOP to unsubscribe or HELP for help.” STOP suppresses future texts. A person may read public studies without opting in.

## Opt-in method proof field

> Public invitation and exact program terms: https://rooted-together.com/sms . The ROOTED/AGREE exchange and the exact automated replies are described on that page and in the message flow above. Privacy Policy: https://rooted-together.com/privacy . Terms & Conditions: https://rooted-together.com/terms .

These URLs must resolve publicly before submission. Capture a screenshot of the live invitation page if Twilio requests additional visual proof. Campaign sample messages should show Rooted Application as sender and a public study link, and indicate that the link is embedded. The sender scope is one church during this pilot. Additional churches require a reviewed ISV sender and campaign design.

## Runtime setup after approval

1. Run migration 030 through `rooted-migrate` with the replacement backend image. Deploy that backend to API and one worker, then the frontend. Preserve earlier migrations' LF checksums.
2. In the Messaging Service, set incoming message handling to POST to `https://rooted-together.com/api/v1/provider-callbacks/twilio/{churchId}/{connectionId}` after the Rooted Twilio connection is created. If Advanced Opt-Out is enabled, ensure its STOP/START/HELP replies and callbacks are tested; Rooted does not send a second reply when Twilio supplies `OptOutType=START`.
3. Configure the backend's Twilio account SID, Auth Token secret, Messaging Service SID, church ID, sender scope, sender name, encryption key and activation flag. The existing `STUDY_COWRITER_ONLY=true` blocks the provider runtime and must be deliberately changed on API and worker. Keep church study SMS disabled until sender approval and callback tests pass.
4. Confirm a keyword subscriber's time zone in Delivery before sending; unknown zones remain held. Configure a nonzero church SMS segment budget and approve one exact study SMS with a separate reviewer.
5. Test on one opted-in handset: ROOTED, AGREE, one scheduled published study, link open without sign-in, STOP, and no later send. Record Twilio delivery status and Rooted suppression evidence.
