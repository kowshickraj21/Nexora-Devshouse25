using UnityEngine;
using UnityEngine.UI;
using UnityEngine.SceneManagement;
using TMPro;
using UnityEngine.Networking;
using System.Collections;

public class SignupManager : MonoBehaviour
{
    public TMP_InputField NameInput;
    public TMP_InputField EmailInput;
    public TMP_InputField PasswordInput;
    public TMP_InputField ConfirmPasswordInput;
    public Button SignupButton;
    public Button LoginButton;
    public TextMeshProUGUI messageText;

    private string signupURL = "http://localhost:3000/signup";

    void Start()
    {
        SignupButton.onClick.AddListener(OnSignupButtonClicked);
        LoginButton.onClick.AddListener(OnLoginButtonClicked);
    }

    void OnSignupButtonClicked()
    {
        string username = NameInput.text;
        string email = EmailInput.text;
        string password = PasswordInput.text;
        string confirmPassword = ConfirmPasswordInput.text;

        if (password != confirmPassword)
        {
            Debug.Log("Passwords do not match.");
            if (messageText) messageText.text = "Passwords do not match.";
            return;
        }

        StartCoroutine(Signup(username, email, password));
    }

    void OnLoginButtonClicked()
    {
        SceneManager.LoadScene("LoginScene");
    }

    IEnumerator Signup(string username, string email, string password)
    {
        print(username);
        string jsonData = JsonUtility.ToJson(new SignupData
        {
            name = username,
            email = email,
            password = password
        });

        UnityWebRequest request = new UnityWebRequest(signupURL, "POST");
        byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(jsonData);
        request.uploadHandler = new UploadHandlerRaw(bodyRaw);
        request.downloadHandler = new DownloadHandlerBuffer();
        request.SetRequestHeader("Content-Type", "application/json");

        yield return request.SendWebRequest();

        if (request.result != UnityWebRequest.Result.Success)
        {
            Debug.LogError("Signup failed: " + request.error);
            if (messageText) messageText.text = "Signup failed: " + request.error;
        }
        else
        {
            Debug.Log("Signup successful: " + request.downloadHandler.text);
            if (messageText) messageText.text = "Signup successful! Redirecting...";
            yield return new WaitForSeconds(1.5f);
            SceneManager.LoadScene("LoginScene");
        }
    }

    [System.Serializable]
    public class SignupData
    {
        public string name;
        public string email;
        public string password;
    }
}
